import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { InventoryTransactionStatus, StockMovementType } from '@prisma/client'
import { updateItemStock, checkStockLevels } from '@/lib/finance/inventory-utils'

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

    const purchase = await prisma.purchaseTransaction.findUnique({
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
        supplier: {
          select: {
            id: true,
            name: true,
            partyType: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!purchase) {
      return errorResponse('Purchase not found', 404)
    }

    return successResponse(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return errorResponse('Failed to fetch purchase', 500)
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
      unitPrice,
      purchaseDate,
      description,
      status,
    } = body

    const existing = await prisma.purchaseTransaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Purchase not found', 404)
    }

    // If status is being changed to CANCELLED, reverse stock movement
    if (status === InventoryTransactionStatus.CANCELLED && existing.status !== InventoryTransactionStatus.CANCELLED) {
      // Find and reverse the stock movement
      const stockMovement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: id,
          referenceType: StockMovementType.PURCHASE,
        },
      })

      if (stockMovement) {
        // Create reverse movement
        await updateItemStock(
          existing.itemId,
          existing.locationId,
          -existing.quantity,
          StockMovementType.ADJUSTMENT,
          id,
          user.id
        )
      }
    }

    // If quantity or unit price changed, recalculate total
    const finalQuantity = quantity !== undefined ? quantity : existing.quantity
    const finalUnitPrice = unitPrice !== undefined ? unitPrice : existing.unitPrice
    const totalPrice = finalQuantity * finalUnitPrice

    if (quantity !== undefined && quantity <= 0) {
      return errorResponse('Quantity must be greater than 0', 400)
    }

    if (unitPrice !== undefined && unitPrice < 0) {
      return errorResponse('Unit price cannot be negative', 400)
    }

    // If quantity changed and purchase is completed, adjust stock
    if (
      quantity !== undefined &&
      quantity !== existing.quantity &&
      existing.status === InventoryTransactionStatus.COMPLETED &&
      status !== InventoryTransactionStatus.CANCELLED
    ) {
      const quantityDiff = quantity - existing.quantity
      await updateItemStock(
        existing.itemId,
        existing.locationId,
        quantityDiff,
        StockMovementType.ADJUSTMENT,
        id,
        user.id
      )
    }

    const purchase = await prisma.purchaseTransaction.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity: finalQuantity }),
        ...(unitPrice !== undefined && { unitPrice: finalUnitPrice }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
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
        supplier: {
          select: {
            id: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse(purchase, 'Purchase updated successfully')
  } catch (error) {
    console.error('Error updating purchase:', error)
    return errorResponse('Failed to update purchase', 500)
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

    const purchase = await prisma.purchaseTransaction.findUnique({
      where: { id },
    })

    if (!purchase) {
      return errorResponse('Purchase not found', 404)
    }

    // If purchase is completed, reverse stock movement
    if (purchase.status === InventoryTransactionStatus.COMPLETED) {
      // Find the stock movement
      const stockMovement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: id,
          referenceType: StockMovementType.PURCHASE,
        },
      })

      if (stockMovement) {
        // Create reverse movement
        await updateItemStock(
          purchase.itemId,
          purchase.locationId,
          -purchase.quantity,
          StockMovementType.ADJUSTMENT,
          id,
          user.id
        )
      }
    }

    // Delete the purchase
    await prisma.purchaseTransaction.delete({
      where: { id },
    })

    return successResponse(null, 'Purchase deleted successfully')
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return errorResponse('Failed to delete purchase', 500)
  }
}
