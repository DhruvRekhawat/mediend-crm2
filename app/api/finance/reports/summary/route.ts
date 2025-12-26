import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { TransactionType, LedgerStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'payment-mode'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    switch (reportType) {
      case 'payment-mode': {
        // Payment mode balance summary
        const paymentModes = await prisma.paymentModeMaster.findMany({
          where: { isActive: true },
          include: {
            ledgerEntries: {
              where: {
                status: LedgerStatus.APPROVED,
                ...(Object.keys(dateFilter).length > 0 && {
                  transactionDate: dateFilter,
                }),
              },
              select: {
                transactionType: true,
                paymentAmount: true,
                receivedAmount: true,
              },
            },
          },
        })

        const summary = paymentModes.map((mode) => {
          const totalCredits = mode.ledgerEntries
            .filter((e) => e.transactionType === TransactionType.CREDIT)
            .reduce((sum, e) => sum + (e.receivedAmount || 0), 0)

          const totalDebits = mode.ledgerEntries
            .filter((e) => e.transactionType === TransactionType.DEBIT)
            .reduce((sum, e) => sum + (e.paymentAmount || 0), 0)

          return {
            id: mode.id,
            name: mode.name,
            openingBalance: mode.openingBalance,
            currentBalance: mode.currentBalance,
            totalCredits,
            totalDebits,
            netChange: totalCredits - totalDebits,
          }
        })

        return successResponse({
          type: 'payment-mode',
          data: summary,
          totals: {
            totalCredits: summary.reduce((sum, s) => sum + s.totalCredits, 0),
            totalDebits: summary.reduce((sum, s) => sum + s.totalDebits, 0),
            totalBalance: summary.reduce((sum, s) => sum + s.currentBalance, 0),
          },
        })
      }

      case 'party-wise': {
        // Party-wise summary
        const entries = await prisma.ledgerEntry.groupBy({
          by: ['partyId', 'transactionType'],
          where: {
            status: LedgerStatus.APPROVED,
            ...(Object.keys(dateFilter).length > 0 && {
              transactionDate: dateFilter,
            }),
          },
          _sum: {
            paymentAmount: true,
            receivedAmount: true,
          },
          _count: true,
        })

        // Get party names
        const partyIds = [...new Set(entries.map((e) => e.partyId))]
        const parties = await prisma.partyMaster.findMany({
          where: { id: { in: partyIds } },
          select: { id: true, name: true, partyType: true },
        })
        const partyMap = new Map(parties.map((p) => [p.id, p]))

        // Aggregate by party
        const partyData = new Map<
          string,
          {
            partyId: string
            partyName: string
            partyType: string
            totalCredits: number
            totalDebits: number
            entriesCount: number
          }
        >()

        entries.forEach((entry) => {
          const party = partyMap.get(entry.partyId)
          if (!party) return

          const existing = partyData.get(entry.partyId) || {
            partyId: entry.partyId,
            partyName: party.name,
            partyType: party.partyType,
            totalCredits: 0,
            totalDebits: 0,
            entriesCount: 0,
          }

          if (entry.transactionType === TransactionType.CREDIT) {
            existing.totalCredits += entry._sum.receivedAmount || 0
          } else {
            existing.totalDebits += entry._sum.paymentAmount || 0
          }
          existing.entriesCount += entry._count

          partyData.set(entry.partyId, existing)
        })

        const summary = Array.from(partyData.values()).map((p) => ({
          ...p,
          netAmount: p.totalCredits - p.totalDebits,
        }))

        return successResponse({
          type: 'party-wise',
          data: summary,
          totals: {
            totalCredits: summary.reduce((sum, s) => sum + s.totalCredits, 0),
            totalDebits: summary.reduce((sum, s) => sum + s.totalDebits, 0),
            entriesCount: summary.reduce((sum, s) => sum + s.entriesCount, 0),
          },
        })
      }

      case 'head-wise': {
        // Head-wise summary
        const entries = await prisma.ledgerEntry.groupBy({
          by: ['headId', 'transactionType'],
          where: {
            status: LedgerStatus.APPROVED,
            ...(Object.keys(dateFilter).length > 0 && {
              transactionDate: dateFilter,
            }),
          },
          _sum: {
            paymentAmount: true,
            receivedAmount: true,
          },
          _count: true,
        })

        // Get head names
        const headIds = [...new Set(entries.map((e) => e.headId))]
        const heads = await prisma.headMaster.findMany({
          where: { id: { in: headIds } },
          select: { id: true, name: true, department: true },
        })
        const headMap = new Map(heads.map((h) => [h.id, h]))

        // Aggregate by head
        const headData = new Map<
          string,
          {
            headId: string
            headName: string
            department: string | null
            totalCredits: number
            totalDebits: number
            entriesCount: number
          }
        >()

        entries.forEach((entry) => {
          const head = headMap.get(entry.headId)
          if (!head) return

          const existing = headData.get(entry.headId) || {
            headId: entry.headId,
            headName: head.name,
            department: head.department,
            totalCredits: 0,
            totalDebits: 0,
            entriesCount: 0,
          }

          if (entry.transactionType === TransactionType.CREDIT) {
            existing.totalCredits += entry._sum.receivedAmount || 0
          } else {
            existing.totalDebits += entry._sum.paymentAmount || 0
          }
          existing.entriesCount += entry._count

          headData.set(entry.headId, existing)
        })

        const summary = Array.from(headData.values()).map((h) => ({
          ...h,
          netAmount: h.totalCredits - h.totalDebits,
        }))

        return successResponse({
          type: 'head-wise',
          data: summary,
          totals: {
            totalCredits: summary.reduce((sum, s) => sum + s.totalCredits, 0),
            totalDebits: summary.reduce((sum, s) => sum + s.totalDebits, 0),
            entriesCount: summary.reduce((sum, s) => sum + s.entriesCount, 0),
          },
        })
      }

      case 'day-wise': {
        // Day-wise summary
        const entries = await prisma.ledgerEntry.findMany({
          where: {
            status: LedgerStatus.APPROVED,
            ...(Object.keys(dateFilter).length > 0 && {
              transactionDate: dateFilter,
            }),
          },
          select: {
            transactionDate: true,
            transactionType: true,
            paymentAmount: true,
            receivedAmount: true,
          },
          orderBy: { transactionDate: 'desc' },
        })

        // Group by date
        const dayData = new Map<
          string,
          {
            date: string
            totalCredits: number
            totalDebits: number
            entriesCount: number
          }
        >()

        entries.forEach((entry) => {
          const dateKey = entry.transactionDate.toISOString().split('T')[0]

          const existing = dayData.get(dateKey) || {
            date: dateKey,
            totalCredits: 0,
            totalDebits: 0,
            entriesCount: 0,
          }

          if (entry.transactionType === TransactionType.CREDIT) {
            existing.totalCredits += entry.receivedAmount || 0
          } else {
            existing.totalDebits += entry.paymentAmount || 0
          }
          existing.entriesCount += 1

          dayData.set(dateKey, existing)
        })

        const summary = Array.from(dayData.values())
          .map((d) => ({
            ...d,
            netChange: d.totalCredits - d.totalDebits,
          }))
          .sort((a, b) => b.date.localeCompare(a.date))

        return successResponse({
          type: 'day-wise',
          data: summary,
          totals: {
            totalCredits: summary.reduce((sum, s) => sum + s.totalCredits, 0),
            totalDebits: summary.reduce((sum, s) => sum + s.totalDebits, 0),
            entriesCount: summary.reduce((sum, s) => sum + s.entriesCount, 0),
          },
        })
      }

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return errorResponse('Failed to generate report', 500)
  }
}

