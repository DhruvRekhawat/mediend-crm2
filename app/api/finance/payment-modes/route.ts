import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma, TransactionType, LedgerStatus } from '@prisma/client'

/**
 * Calculate opening balance for a payment mode on a specific date
 * Opening balance on a date = openingBalance + all approved transactions up to (and including) that date
 */
async function getOpeningBalanceOnDate(paymentModeId: string, date: Date): Promise<number> {
  const paymentMode = await prisma.paymentModeMaster.findUnique({
    where: { id: paymentModeId },
    select: { openingBalance: true },
  })

  if (!paymentMode) {
    return 0
  }

  // Get all approved transactions up to and including the date
  // End of day for the date - parse as UTC to match database storage
  let endOfDay: Date
  if (date instanceof Date) {
    // If it's a Date object, convert to UTC end of day
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`)
  } else {
    // If it's a date string (YYYY-MM-DD), parse it as UTC
    endOfDay = new Date(`${date}T23:59:59.999Z`)
  }

  const [credits, debits] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: {
        paymentModeId,
        transactionType: TransactionType.CREDIT,
        status: LedgerStatus.APPROVED,
        transactionDate: { lte: endOfDay },
      },
      _sum: {
        receivedAmount: true,
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        paymentModeId,
        transactionType: TransactionType.DEBIT,
        status: LedgerStatus.APPROVED,
        transactionDate: { lte: endOfDay },
      },
      _sum: {
        paymentAmount: true,
      },
    }),
  ])

  const totalCredits = credits._sum.receivedAmount ?? 0
  const totalDebits = debits._sum.paymentAmount ?? 0

  return paymentMode.openingBalance + totalCredits - totalDebits
}

/**
 * Calculate projected balance assuming all pending debit entries are approved
 * Projected balance = current balance - sum of all pending debit amounts
 */
async function getProjectedBalance(paymentModeId: string): Promise<number> {
  const paymentMode = await prisma.paymentModeMaster.findUnique({
    where: { id: paymentModeId },
    select: { currentBalance: true },
  })

  if (!paymentMode) {
    return 0
  }

  // Get sum of all pending debit entries
  const pendingDebits = await prisma.ledgerEntry.aggregate({
    where: {
      paymentModeId,
      transactionType: TransactionType.DEBIT,
      status: LedgerStatus.PENDING,
      isDeleted: false,
    },
    _sum: {
      paymentAmount: true,
    },
  })

  const totalPendingDebits = pendingDebits._sum.paymentAmount ?? 0

  // Projected balance = current balance - pending debits (since debits reduce balance)
  return paymentMode.currentBalance - totalPendingDebits
}

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
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const asOfDate = searchParams.get('asOfDate') // Date to calculate opening balance
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.PaymentModeMasterWhereInput = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [paymentModes, total] = await Promise.all([
      prisma.paymentModeMaster.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentModeMaster.count({ where }),
    ])

    // If asOfDate is provided, calculate opening balance for that date
    let modesWithBalance = paymentModes
    if (asOfDate) {
      // Parse date string as UTC to match database storage
      // Date string format: YYYY-MM-DD
      const date = new Date(`${asOfDate}T00:00:00.000Z`)
      modesWithBalance = await Promise.all(
        paymentModes.map(async (mode) => {
          const openingBalanceOnDate = await getOpeningBalanceOnDate(mode.id, date)
          return {
            ...mode,
            openingBalance: openingBalanceOnDate,
            currentBalance: openingBalanceOnDate, // On that date, opening = current
            projectedBalance: openingBalanceOnDate, // For historical dates, projected = current
          }
        })
      )
    } else {
      // Calculate projected balance for current date (assuming all pending debits are approved)
      modesWithBalance = await Promise.all(
        paymentModes.map(async (mode) => {
          const projectedBalance = await getProjectedBalance(mode.id)
          return {
            ...mode,
            projectedBalance,
          }
        })
      )
    }

    return successResponse({
      data: modesWithBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payment modes:', error)
    return errorResponse('Failed to fetch payment modes', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { name, description, openingBalance } = body

    if (!name) {
      return errorResponse('Name is required', 400)
    }

    if (openingBalance === undefined || openingBalance === null) {
      return errorResponse('Opening balance is required', 400)
    }

    if (typeof openingBalance !== 'number' || openingBalance < 0) {
      return errorResponse('Opening balance must be a non-negative number', 400)
    }

    // Check for duplicate name
    const existing = await prisma.paymentModeMaster.findUnique({
      where: { name },
    })

    if (existing) {
      return errorResponse('Payment mode with this name already exists', 400)
    }

    // When creating a payment mode, opening balance = current balance initially
    const paymentMode = await prisma.paymentModeMaster.create({
      data: {
        name,
        description,
        openingBalance,
        currentBalance: openingBalance, // Initially same as opening balance
      },
    })

    return successResponse(paymentMode, 'Payment mode created successfully')
  } catch (error) {
    console.error('Error creating payment mode:', error)
    return errorResponse('Failed to create payment mode', 500)
  }
}

