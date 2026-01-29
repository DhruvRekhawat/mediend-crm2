import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, LedgerStatus, TransactionType } from '@prisma/client'
import { getSession } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD and ADMIN can access
    if (user.role !== 'MD' && user.role !== 'ADMIN') {
      console.log('MD Finance API: Access denied for role:', user.role)
      return errorResponse(`Forbidden: Access denied for role ${user.role}. Only MD and ADMIN can access.`, 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const where: Prisma.LedgerEntryWhereInput = {
      isDeleted: false,
      ...(Object.keys(dateFilter).length > 0 && {
        transactionDate: dateFilter,
      }),
    }

    // Overall Financial Health
    const [
      totalRevenue,
      totalExpenses,
      pendingApprovals,
      approvedAmount,
      rejectedAmount,
      allEntries,
    ] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: {
          ...where,
          transactionType: 'CREDIT',
          status: LedgerStatus.APPROVED,
          paymentType: {
            paymentType: {
              not: 'RECEIPT',
            },
          },
          paymentTypeId: { not: null },
        },
        _sum: { receivedAmount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          ...where,
          transactionType: 'DEBIT',
          status: LedgerStatus.APPROVED,
        },
        _sum: { paymentAmount: true },
      }),
      prisma.ledgerEntry.count({
        where: {
          ...where,
          status: LedgerStatus.PENDING,
        },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          ...where,
          status: LedgerStatus.APPROVED,
        },
        _sum: {
          receivedAmount: true,
          paymentAmount: true,
        },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          ...where,
          status: LedgerStatus.REJECTED,
        },
        _sum: {
          receivedAmount: true,
          paymentAmount: true,
        },
      }),
      prisma.ledgerEntry.findMany({
        where,
        select: {
          transactionDate: true,
          transactionType: true,
          receivedAmount: true,
          paymentAmount: true,
          status: true,
        },
        orderBy: { transactionDate: 'asc' },
      }),
    ])

    const netCashFlow = (totalRevenue._sum.receivedAmount || 0) - (totalExpenses._sum.paymentAmount || 0)
    const approvedAmountTotal = (approvedAmount._sum.receivedAmount || 0) + (approvedAmount._sum.paymentAmount || 0)
    const rejectedAmountTotal = (rejectedAmount._sum.receivedAmount || 0) + (rejectedAmount._sum.paymentAmount || 0)

    // Transaction Trends (Daily) - Exclude SELF_TRANSFER and RECEIPT payment type
    const dailyTrends = await prisma.ledgerEntry.groupBy({
      by: ['transactionDate', 'transactionType'],
      where: {
        ...where,
        status: LedgerStatus.APPROVED,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
        OR: [
          {
            transactionType: TransactionType.DEBIT,
          },
          {
            transactionType: TransactionType.CREDIT,
            paymentType: {
              paymentType: {
                not: 'RECEIPT',
              },
            },
            paymentTypeId: { not: null },
          },
        ],
      },
      _sum: {
        receivedAmount: true,
        paymentAmount: true,
      },
      _count: true,
    })

    const trendsMap = new Map<string, { date: string; credit: number; debit: number }>()
    dailyTrends.forEach((trend) => {
      const dateKey = trend.transactionDate.toISOString().split('T')[0]
      const existing = trendsMap.get(dateKey) || { date: dateKey, credit: 0, debit: 0 }
      if (trend.transactionType === 'CREDIT') {
        existing.credit += trend._sum.receivedAmount || 0
      } else if (trend.transactionType === 'DEBIT') {
        existing.debit += trend._sum.paymentAmount || 0
      }
      trendsMap.set(dateKey, existing)
    })

    const transactionTrends = Array.from(trendsMap.values())
      .map((t) => ({
        ...t,
        netFlow: t.credit - t.debit,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Party Analysis - Exclude RECEIPT payment type from revenue
    const partyStats = await prisma.ledgerEntry.groupBy({
      by: ['partyId', 'transactionType'],
      where: {
        ...where,
        status: LedgerStatus.APPROVED,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
        OR: [
          {
            transactionType: TransactionType.DEBIT,
          },
          {
            transactionType: TransactionType.CREDIT,
            paymentType: {
              paymentType: {
                not: 'RECEIPT',
              },
            },
            paymentTypeId: { not: null },
          },
        ],
      },
      _sum: {
        receivedAmount: true,
        paymentAmount: true,
      },
      _count: true,
    })

    const partyMap = new Map<
      string,
      {
        partyId: string
        partyName: string
        partyType: string
        totalCredits: number
        totalDebits: number
        transactionCount: number
      }
    >()

    partyStats.forEach((stat) => {
      // Ensure stat.partyId is a string before using as Map key
      if (!stat.partyId) return;
      const existing = partyMap.get(stat.partyId as string) || {
        partyId: stat.partyId as string,
        partyName: '',
        partyType: '',
        totalCredits: 0,
        totalDebits: 0,
        transactionCount: 0,
      }
      if (stat.transactionType === 'CREDIT') {
        existing.totalCredits += stat._sum.receivedAmount || 0
      } else if (stat.transactionType === 'DEBIT') {
        existing.totalDebits += stat._sum.paymentAmount || 0
      }
      existing.transactionCount += stat._count
      partyMap.set(stat.partyId, existing)
    })

    const partyIds = Array.from(partyMap.keys())
    const parties = await prisma.partyMaster.findMany({
      where: { id: { in: partyIds } },
      select: { id: true, name: true, partyType: true },
    })

    const partyMapData = new Map(parties.map((p) => [p.id, p]))
    const partyAnalysis = Array.from(partyMap.values())
      .map((p) => {
        const party = partyMapData.get(p.partyId)
        return {
          partyId: p.partyId,
          partyName: party?.name || 'Unknown',
          partyType: party?.partyType || 'UNKNOWN',
          totalCredits: p.totalCredits,
          totalDebits: p.totalDebits,
          netAmount: p.totalCredits - p.totalDebits,
          transactionCount: p.transactionCount,
        }
      })
      .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))
      .slice(0, 20)

    // Head/Category Analysis - Exclude RECEIPT payment type from revenue
    const headStats = await prisma.ledgerEntry.groupBy({
      by: ['headId', 'transactionType'],
      where: {
        ...where,
        status: LedgerStatus.APPROVED,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
        OR: [
          {
            transactionType: TransactionType.DEBIT,
          },
          {
            transactionType: TransactionType.CREDIT,
            paymentType: {
              paymentType: {
                not: 'RECEIPT',
              },
            },
            paymentTypeId: { not: null },
          },
        ],
      },
      _sum: {
        receivedAmount: true,
        paymentAmount: true,
      },
      _count: true,
    })

    const headMap = new Map<
      string,
      {
        headId: string
        headName: string
        department: string | null
        totalCredits: number
        totalDebits: number
        transactionCount: number
      }
    >()

    headStats.forEach((stat) => {
      // Ensure stat.headId is a string before using as Map key
      if (!stat.headId) return;
      const existing = headMap.get(stat.headId) || {
        headId: stat.headId,
        headName: '',
        department: null,
        totalCredits: 0,
        totalDebits: 0,
        transactionCount: 0,
      }
      if (stat.transactionType === 'CREDIT') {
        existing.totalCredits += stat._sum.receivedAmount || 0
      } else if (stat.transactionType === 'DEBIT') {
        existing.totalDebits += stat._sum.paymentAmount || 0
      }
      existing.transactionCount += stat._count
      headMap.set(stat.headId, existing)
    })

    const headIds = Array.from(headMap.keys())
    const heads = await prisma.headMaster.findMany({
      where: { id: { in: headIds } },
      select: { id: true, name: true, department: true },
    })

    const headMapData = new Map(heads.map((h) => [h.id, h]))
    const headAnalysis = Array.from(headMap.values())
      .map((h) => {
        const head = headMapData.get(h.headId)
        return {
          headId: h.headId,
          headName: head?.name || 'Unknown',
          department: head?.department || null,
          totalCredits: h.totalCredits,
          totalDebits: h.totalDebits,
          netAmount: h.totalCredits - h.totalDebits,
          transactionCount: h.transactionCount,
        }
      })
      .sort((a, b) => Math.abs(b.totalDebits) - Math.abs(a.totalDebits))
      .slice(0, 20)

    // Payment Mode Analysis - Exclude SELF_TRANSFER
    const paymentModeStats = await prisma.ledgerEntry.groupBy({
      by: ['paymentModeId', 'transactionType'],
      where: {
        ...where,
        status: LedgerStatus.APPROVED,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
      },
      _sum: {
        receivedAmount: true,
        paymentAmount: true,
      },
      _count: true,
    })

    const paymentModeMap = new Map<
      string,
      {
        paymentModeId: string
        paymentModeName: string
        totalCredits: number
        totalDebits: number
        transactionCount: number
        currentBalance: number
      }
    >()

    paymentModeStats.forEach((stat) => {
      // Ensure stat.paymentModeId is a string before using as Map key
      if (!stat.paymentModeId) return;
      const existing = paymentModeMap.get(stat.paymentModeId) || {
        paymentModeId: stat.paymentModeId,
        paymentModeName: '',
        totalCredits: 0,
        totalDebits: 0,
        transactionCount: 0,
        currentBalance: 0,
      }
      if (stat.transactionType === 'CREDIT') {
        existing.totalCredits += stat._sum.receivedAmount || 0
      } else if (stat.transactionType === 'DEBIT') {
        existing.totalDebits += stat._sum.paymentAmount || 0
      }
      existing.transactionCount += stat._count
      paymentModeMap.set(stat.paymentModeId, existing)
    })

    const paymentModeIds = Array.from(paymentModeMap.keys())
    const paymentModes = await prisma.paymentModeMaster.findMany({
      where: { id: { in: paymentModeIds } },
      select: { id: true, name: true, currentBalance: true },
    })

    const paymentModeMapData = new Map(paymentModes.map((p) => [p.id, p]))
    const paymentModeAnalysis = Array.from(paymentModeMap.values())
      .map((p) => {
        const mode = paymentModeMapData.get(p.paymentModeId)
        return {
          paymentModeId: p.paymentModeId,
          paymentModeName: mode?.name || 'Unknown',
          totalCredits: p.totalCredits,
          totalDebits: p.totalDebits,
          netFlow: p.totalCredits - p.totalDebits,
          transactionCount: p.transactionCount,
          currentBalance: mode?.currentBalance || 0,
        }
      })
      .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))

    // Approval Status Breakdown
    const approvalStatusStats = await prisma.ledgerEntry.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: {
        receivedAmount: true,
        paymentAmount: true,
      },
    })

    const approvalStatus = approvalStatusStats.map((stat) => ({
      status: stat.status,
      count: stat._count,
      amount: (stat._sum.receivedAmount || 0) + (stat._sum.paymentAmount || 0),
    }))

    // Top Transactions - Exclude SELF_TRANSFER
    const topTransactions = await prisma.ledgerEntry.findMany({
      where: {
        ...where,
        status: LedgerStatus.APPROVED,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
      },
      orderBy: [
        { receivedAmount: 'desc' },
        { paymentAmount: 'desc' },
      ],
      take: 20,
      include: {
        party: { select: { name: true, partyType: true } },
        head: { select: { name: true } },
        paymentMode: { select: { name: true } },
      },
    })

    const topTransactionsData = topTransactions
      .filter((t) => t.transactionType !== TransactionType.SELF_TRANSFER)
      .map((t) => ({
        id: t.id,
        serialNumber: t.serialNumber,
        transactionDate: t.transactionDate,
        transactionType: t.transactionType,
        partyName: t.party?.name || '',
        partyType: t.party?.partyType || '',
        headName: t.head?.name || '',
        paymentModeName: t.paymentMode?.name || '',
        amount: t.transactionType === 'CREDIT' ? t.receivedAmount || 0 : t.paymentAmount || 0,
        description: t.description,
      }))

    // Pending Approvals - Exclude SELF_TRANSFER (they are auto-approved)
    const pendingApprovalsList = await prisma.ledgerEntry.findMany({
      where: {
        ...where,
        status: LedgerStatus.PENDING,
        transactionType: {
          in: [TransactionType.CREDIT, TransactionType.DEBIT],
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 50,
      include: {
        party: { select: { name: true, partyType: true } },
        head: { select: { name: true } },
        paymentMode: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })

    const pendingApprovalsData = pendingApprovalsList.map((t) => ({
      id: t.id,
      serialNumber: t.serialNumber,
      transactionDate: t.transactionDate,
      transactionType: t.transactionType,
      partyName: t.party?.name || '',
      partyType: t.party?.partyType || '',
      headName: t.head?.name || '',
      paymentModeName: t.paymentMode?.name || '',
      amount: t.transactionType === 'CREDIT' ? t.receivedAmount || 0 : t.paymentAmount || 0,
      description: t.description,
      createdByName: t.createdBy.name,
    }))

    return successResponse({
      kpis: {
        totalRevenue: totalRevenue._sum.receivedAmount || 0,
        totalExpenses: totalExpenses._sum.paymentAmount || 0,
        netCashFlow,
        pendingApprovalsCount: pendingApprovals,
        approvedAmount: approvedAmountTotal,
        rejectedAmount: rejectedAmountTotal,
      },
      transactionTrends,
      partyAnalysis,
      headAnalysis,
      paymentModeAnalysis,
      approvalStatus,
      topTransactions: topTransactionsData,
      pendingApprovals: pendingApprovalsData,
    })
  } catch (error) {
    console.error('Error fetching MD finance analytics:', error)
    return errorResponse('Failed to fetch finance analytics', 500)
  }
}
