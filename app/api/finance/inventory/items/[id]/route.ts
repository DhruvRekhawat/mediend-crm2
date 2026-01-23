import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getItemStock, getItemStockAllLocations } from '@/lib/finance/inventory-utils'

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
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const includeStock = searchParams.get('includeStock') !== 'false' // Default true

    const item = await prisma.itemMaster.findUnique({
      where: { id },
      include: {
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
        _count: {
          select: {
            purchases: true,
            issues: true,
          },
        },
      },
    })

    if (!item) {
      return errorResponse('Item not found', 404)
    }

    // Add stock information
    const stockInfo: any = {}
    if (includeStock) {
      if (locationId) {
        const currentStock = await getItemStock(id, locationId)
        stockInfo.currentStock = currentStock
        stockInfo.locationId = locationId
      } else {
        const currentStock = await getItemStockAllLocations(id)
        stockInfo.currentStock = currentStock
      }
    }

    return successResponse({
      ...item,
      ...stockInfo,
    })
  } catch (error) {
    console.error('Error fetching item:', error)
    return errorResponse('Failed to fetch item', 500)
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
    const {
      name,
      price,
      unit,
      supplierId,
      locationId,
      minimumStockLevel,
      maximumStockLevel,
      description,
      isActive,
    } = body

    const existing = await prisma.itemMaster.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Item not found', 404)
    }

    // Validate price
    if (price !== undefined && price < 0) {
      return errorResponse('Price cannot be negative', 400)
    }

    // Validate stock levels
    if (minimumStockLevel !== undefined && minimumStockLevel < 0) {
      return errorResponse('Minimum stock level cannot be negative', 400)
    }

    if (maximumStockLevel !== undefined && maximumStockLevel < 0) {
      return errorResponse('Maximum stock level cannot be negative', 400)
    }

    const finalMinLevel = minimumStockLevel !== undefined ? minimumStockLevel : existing.minimumStockLevel
    const finalMaxLevel = maximumStockLevel !== undefined ? maximumStockLevel : existing.maximumStockLevel

    if (finalMinLevel > finalMaxLevel) {
      return errorResponse('Minimum stock level cannot be greater than maximum stock level', 400)
    }

    // Validate supplier if changed
    if (supplierId && supplierId !== existing.supplierId) {
      const supplier = await prisma.partyMaster.findUnique({
        where: { id: supplierId },
      })

      if (!supplier || !supplier.isActive) {
        return errorResponse('Invalid or inactive supplier', 400)
      }

      if (supplier.partyType !== 'SUPPLIER') {
        return errorResponse('Supplier must be of type SUPPLIER', 400)
      }
    }

    // Validate location if changed
    if (locationId && locationId !== existing.locationId) {
      const location = await prisma.locationMaster.findUnique({
        where: { id: locationId },
      })

      if (!location || !location.isActive) {
        return errorResponse('Invalid or inactive location', 400)
      }
    }

    const item = await prisma.itemMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(unit !== undefined && { unit }),
        ...(supplierId !== undefined && { supplierId }),
        ...(locationId !== undefined && { locationId }),
        ...(minimumStockLevel !== undefined && { minimumStockLevel }),
        ...(maximumStockLevel !== undefined && { maximumStockLevel }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
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
          },
        },
      },
    })

    return successResponse(item, 'Item updated successfully')
  } catch (error) {
    console.error('Error updating item:', error)
    return errorResponse('Failed to update item', 500)
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

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const item = await prisma.itemMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
            issues: true,
          },
        },
      },
    })

    if (!item) {
      return errorResponse('Item not found', 404)
    }

    // Check if item has transactions
    if (item._count.purchases > 0 || item._count.issues > 0) {
      return errorResponse(
        'Cannot delete item with transactions. Deactivate it instead.',
        400
      )
    }

    await prisma.itemMaster.delete({
      where: { id },
    })

    return successResponse(null, 'Item deleted successfully')
  } catch (error) {
    console.error('Error deleting item:', error)
    return errorResponse('Failed to delete item', 500)
  }
}
