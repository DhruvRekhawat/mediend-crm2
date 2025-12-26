import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getPaymentModeTotals } from '@/lib/finance'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const paymentMode = await prisma.paymentModeMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    })

    if (!paymentMode) {
      return errorResponse('Payment mode not found', 404)
    }

    // Get transaction totals
    const totals = await getPaymentModeTotals(id)

    return successResponse({
      ...paymentMode,
      ...totals,
    })
  } catch (error) {
    console.error('Error fetching payment mode:', error)
    return errorResponse('Failed to fetch payment mode', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, isActive } = body

    // IMPORTANT: Do NOT allow editing openingBalance or currentBalance
    // Balances can only be changed through approved transactions

    const existing = await prisma.paymentModeMaster.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Payment mode not found', 404)
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.paymentModeMaster.findUnique({
        where: { name },
      })
      if (duplicate) {
        return errorResponse('Payment mode with this name already exists', 400)
      }
    }

    const paymentMode = await prisma.paymentModeMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        // Note: openingBalance and currentBalance are NOT updatable
      },
    })

    return successResponse(paymentMode, 'Payment mode updated successfully')
  } catch (error) {
    console.error('Error updating payment mode:', error)
    return errorResponse('Failed to update payment mode', 500)
  }
}

