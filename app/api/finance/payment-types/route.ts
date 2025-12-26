import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { FinancePaymentType, Prisma } from '@prisma/client'

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
    const paymentType = searchParams.get('paymentType') as FinancePaymentType | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.PaymentTypeMasterWhereInput = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (paymentType) {
      where.paymentType = paymentType
    }

    const [paymentTypes, total] = await Promise.all([
      prisma.paymentTypeMaster.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentTypeMaster.count({ where }),
    ])

    return successResponse({
      data: paymentTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payment types:', error)
    return errorResponse('Failed to fetch payment types', 500)
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
    const { name, paymentType, description } = body

    if (!name || !paymentType) {
      return errorResponse('Name and payment type are required', 400)
    }

    if (!Object.values(FinancePaymentType).includes(paymentType)) {
      return errorResponse('Invalid payment type', 400)
    }

    // Check for duplicate name
    const existing = await prisma.paymentTypeMaster.findUnique({
      where: { name },
    })

    if (existing) {
      return errorResponse('Payment type with this name already exists', 400)
    }

    const type = await prisma.paymentTypeMaster.create({
      data: {
        name,
        paymentType,
        description,
      },
    })

    return successResponse(type, 'Payment type created successfully')
  } catch (error) {
    console.error('Error creating payment type:', error)
    return errorResponse('Failed to create payment type', 500)
  }
}

