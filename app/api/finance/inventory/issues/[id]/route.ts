import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { InventoryTransactionStatus, StockMovementType } from '@prisma/client'
import { updateItemStock, validateStockForIssue, checkStockLevels } from '@/lib/finance/inventory-utils'

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

    const issue = await prisma.issueTransaction.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            price: true,
            unit: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        issuedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!issue) {
      return errorResponse('Issue not found', 404)
    }

    return successResponse(issue)
  } catch (error) {
    console.error('Error fetching issue:', error)
    return errorResponse('Failed to fetch issue', 500)
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

    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()
    const {
      quantity,
      issuedToId,
      issueDate,
      description,
      status,
    } = body

    const existing = await prisma.issueTransaction.findUnique({
      where: { id },
      include: {
        item: true,
      },
    })

    if (!existing) {
      return errorResponse('Issue not found', 404)
    }

    // If status is being changed to CANCELLED, reverse stock movement
    if (status === InventoryTransactionStatus.CANCELLED && existing.status !== InventoryTransactionStatus.CANCELLED) {
      // Create reverse movement (add stock back)
      await updateItemStock(
        existing.itemId,
        existing.locationId,
        existing.quantity, // Positive to add back
        StockMovementType.ADJUSTMENT,
        id,
        user.id
      )
    }

    // If quantity changed and issue is completed, adjust stock
    if (
      quantity !== undefined &&
      quantity !== existing.quantity &&
      existing.status === InventoryTransactionStatus.COMPLETED &&
      status !== InventoryTransactionStatus.CANCELLED
    ) {
      // Validate sufficient stock for increased quantity
      if (quantity > existing.quantity) {
        const additionalQuantity = quantity - existing.quantity
        const stockValidation = await validateStockForIssue(
          existing.itemId,
          existing.locationId,
          additionalQuantity
        )
        if (!stockValidation.isValid) {
          return errorResponse(stockValidation.message || 'Insufficient stock for increased quantity', 400)
        }
      }

      const quantityDiff = quantity - existing.quantity
      // Negative diff means we're reducing the issue, so add stock back
      // Positive diff means we're increasing the issue, so remove more stock
      await updateItemStock(
        existing.itemId,
        existing.locationId,
        -quantityDiff, // Negative because issues reduce stock
        StockMovementType.ADJUSTMENT,
        id,
        user.id
      )
    }

    if (quantity !== undefined && quantity <= 0) {
      return errorResponse('Quantity must be greater than 0', 400)
    }

    // Recalculate total price if quantity changed
    const finalQuantity = quantity !== undefined ? quantity : existing.quantity
    const unitPrice = existing.item.price // Use current item price
    const totalPrice = finalQuantity * unitPrice

    // Validate issued to user if changed
    if (issuedToId && issuedToId !== existing.issuedToId) {
      const issuedTo = await prisma.user.findUnique({
        where: { id: issuedToId },
      })

      if (!issuedTo) {
        return errorResponse('Invalid user', 400)
      }
    }

    const issue = await prisma.issueTransaction.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity: finalQuantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(issuedToId !== undefined && { issuedToId }),
        ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: {
        item: {
          select: {
            id: true,
            itemCode: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        issuedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse(issue, 'Issue updated successfully')
  } catch (error) {
    console.error('Error updating issue:', error)
    return errorResponse('Failed to update issue', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const issue = await prisma.issueTransaction.findUnique({
      where: { id },
    })

    if (!issue) {
      return errorResponse('Issue not found', 404)
    }

    // If issue is completed, reverse stock movement (add stock back)
    if (issue.status === InventoryTransactionStatus.COMPLETED) {
      // Find the stock movement
      const stockMovement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: id,
          referenceType: StockMovementType.ISSUE,
        },
      })

      if (stockMovement) {
        // Create reverse movement (add stock back)
        await updateItemStock(
          issue.itemId,
          issue.locationId,
          issue.quantity, // Positive to add back
          StockMovementType.ADJUSTMENT,
          id,
          user.id
        )
      }
    }

    // Delete the issue
    await prisma.issueTransaction.delete({
      where: { id },
    })

    return successResponse(null, 'Issue deleted successfully')
  } catch (error) {
    console.error('Error deleting issue:', error)
    return errorResponse('Failed to delete issue', 500)
  }
}
