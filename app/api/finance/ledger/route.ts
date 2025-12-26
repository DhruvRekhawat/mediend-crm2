import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { TransactionType, LedgerStatus, LedgerAuditAction, Prisma } from '@prisma/client'
import { generateSerialNumber, updatePaymentModeBalance, getPaymentModeBalance } from '@/lib/finance'

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
    const transactionType = searchParams.get('transactionType') as TransactionType | null
    const status = searchParams.get('status') as LedgerStatus | null
    const partyId = searchParams.get('partyId')
    const headId = searchParams.get('headId')
    const paymentModeId = searchParams.get('paymentModeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.LedgerEntryWhereInput = {}

    if (transactionType) {
      where.transactionType = transactionType
    }

    if (status) {
      where.status = status
    }

    if (partyId) {
      where.partyId = partyId
    }

    if (headId) {
      where.headId = headId
    }

    if (paymentModeId) {
      where.paymentModeId = paymentModeId
    }

    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) {
        where.transactionDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate)
      }
    }

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { party: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          party: {
            select: {
              id: true,
              name: true,
              partyType: true,
            },
          },
          head: {
            select: {
              id: true,
              name: true,
              department: true,
            },
          },
          paymentType: {
            select: {
              id: true,
              name: true,
              paymentType: true,
            },
          },
          paymentMode: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ])

    return successResponse({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching ledger entries:', error)
    return errorResponse('Failed to fetch ledger entries', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const {
      transactionType,
      transactionDate,
      partyId,
      description,
      headId,
      paymentTypeId,
      paymentAmount,
      receivedAmount,
      paymentModeId,
    } = body

    // Validate required fields
    if (!transactionType || !partyId || !description || !headId || !paymentTypeId || !paymentModeId) {
      return errorResponse('Missing required fields', 400)
    }

    if (!Object.values(TransactionType).includes(transactionType)) {
      return errorResponse('Invalid transaction type', 400)
    }

    // Validate amount based on transaction type
    if (transactionType === TransactionType.CREDIT) {
      if (!receivedAmount || receivedAmount <= 0) {
        return errorResponse('Received amount is required for credit transactions', 400)
      }
    } else {
      if (!paymentAmount || paymentAmount <= 0) {
        return errorResponse('Payment amount is required for debit transactions', 400)
      }
    }

    // Validate that party exists and is active
    const party = await prisma.partyMaster.findUnique({
      where: { id: partyId },
    })
    if (!party || !party.isActive) {
      return errorResponse('Invalid or inactive party', 400)
    }

    // Validate head exists and is active
    const head = await prisma.headMaster.findUnique({
      where: { id: headId },
    })
    if (!head || !head.isActive) {
      return errorResponse('Invalid or inactive head', 400)
    }

    // Validate payment type exists and is active
    const paymentTypeRecord = await prisma.paymentTypeMaster.findUnique({
      where: { id: paymentTypeId },
    })
    if (!paymentTypeRecord || !paymentTypeRecord.isActive) {
      return errorResponse('Invalid or inactive payment type', 400)
    }

    // Validate payment mode exists and is active
    const paymentMode = await prisma.paymentModeMaster.findUnique({
      where: { id: paymentModeId },
    })
    if (!paymentMode || !paymentMode.isActive) {
      return errorResponse('Invalid or inactive payment mode', 400)
    }

    // Generate serial number
    const serialNumber = await generateSerialNumber(transactionType)

    // Get current balance before transaction
    const openingBalance = await getPaymentModeBalance(paymentModeId)

    // Determine status and calculate balance
    // CREDIT: Auto-approve, update balance immediately
    // DEBIT: Pending, balance unchanged until approved
    const isCredit = transactionType === TransactionType.CREDIT
    const amount = isCredit ? receivedAmount : paymentAmount
    const status = isCredit ? LedgerStatus.APPROVED : LedgerStatus.PENDING

    let currentBalance = openingBalance
    if (isCredit) {
      // Update payment mode balance for credits
      currentBalance = await updatePaymentModeBalance(paymentModeId, transactionType, amount)
    }

    // Create the ledger entry
    const entry = await prisma.ledgerEntry.create({
      data: {
        serialNumber,
        transactionType,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        partyId,
        description,
        headId,
        paymentTypeId,
        paymentAmount: transactionType === TransactionType.DEBIT ? paymentAmount : null,
        receivedAmount: transactionType === TransactionType.CREDIT ? receivedAmount : null,
        paymentModeId,
        openingBalance,
        currentBalance,
        status,
        createdById: user.id,
        approvedById: isCredit ? user.id : null, // Auto-approved for credits
        approvedAt: isCredit ? new Date() : null,
      },
      include: {
        party: true,
        head: true,
        paymentType: true,
        paymentMode: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.CREATED,
        newData: {
          serialNumber,
          transactionType,
          amount,
          status,
          partyName: party.name,
          headName: head.name,
          paymentModeName: paymentMode.name,
        },
        performedById: user.id,
      },
    })

    const message = isCredit
      ? 'Credit entry created and approved automatically'
      : 'Debit entry created and pending MD approval'

    return successResponse(entry, message)
  } catch (error) {
    console.error('Error creating ledger entry:', error)
    return errorResponse('Failed to create ledger entry', 500)
  }
}

