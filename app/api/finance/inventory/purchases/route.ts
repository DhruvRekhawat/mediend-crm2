import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { InventoryTransactionStatus, Prisma, StockMovementType } from '@prisma/client'
import { generatePurchaseNumber, updateItemStock, checkStockLevels } from '@/lib/finance/inventory-utils'

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
    const itemId = searchParams.get('itemId')
    const supplierId = searchParams.get('supplierId')
    const locationId = searchParams.get('locationId')
    const status = searchParams.get('status') as InventoryTransactionStatus | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.PurchaseTransactionWhereInput = {}

    if (itemId) {
      where.itemId = itemId
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (locationId) {
      where.locationId = locationId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.purchaseDate = {}
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`)
        where.purchaseDate.gte = start
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`)
        where.purchaseDate.lte = end
      }
    }

    const [purchases, total] = await Promise.all([
      prisma.purchaseTransaction.findMany({
        where,
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
        orderBy: { purchaseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseTransaction.count({ where }),
    ])

    return successResponse({
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return errorResponse('Failed to fetch purchases', 500)
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
      itemId,
      supplierId,
      locationId,
      quantity,
      unitPrice,
      purchaseDate,
      description,
    } = body

    if (!itemId || !supplierId || !locationId || !quantity || unitPrice === undefined) {
      return errorResponse('Item, supplier, location, quantity, and unit price are required', 400)
    }

    if (quantity <= 0) {
      return errorResponse('Quantity must be greater than 0', 400)
    }

    if (unitPrice < 0) {
      return errorResponse('Unit price cannot be negative', 400)
    }

    const totalPrice = quantity * unitPrice

    // Validate item exists and is active
    const item = await prisma.itemMaster.findUnique({
      where: { id: itemId },
    })

    if (!item || !item.isActive) {
      return errorResponse('Invalid or inactive item', 400)
    }

    // Validate supplier exists and is a SUPPLIER
    const supplier = await prisma.partyMaster.findUnique({
      where: { id: supplierId },
    })

    if (!supplier || !supplier.isActive) {
      return errorResponse('Invalid or inactive supplier', 400)
    }

    if (supplier.partyType !== 'SUPPLIER') {
      return errorResponse('Supplier must be of type SUPPLIER', 400)
    }

    // Validate location exists and is active
    const location = await prisma.locationMaster.findUnique({
      where: { id: locationId },
    })

    if (!location || !location.isActive) {
      return errorResponse('Invalid or inactive location', 400)
    }

    // Generate purchase number
    const purchaseNumber = await generatePurchaseNumber()

    // Create purchase transaction
    const purchase = await prisma.purchaseTransaction.create({
      data: {
        purchaseNumber,
        itemId,
        supplierId,
        locationId,
        quantity,
        unitPrice,
        totalPrice,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        description,
        status: InventoryTransactionStatus.COMPLETED, // Auto-complete purchases
        createdById: user.id,
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

    // Create stock movement and update stock
    await updateItemStock(
      itemId,
      locationId,
      quantity,
      StockMovementType.PURCHASE,
      purchase.id,
      user.id
    )

    // Check stock levels for alerts
    const stockStatus = await checkStockLevels(itemId, locationId)

    return successResponse(
      {
        ...purchase,
        stockStatus,
      },
      'Purchase created successfully'
    )
  } catch (error) {
    console.error('Error creating purchase:', error)
    return errorResponse('Failed to create purchase', 500)
  }
}
