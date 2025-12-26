import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

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

    return successResponse({
      data: paymentModes,
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

