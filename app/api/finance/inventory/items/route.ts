import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'
import { generateItemCode, getItemStockAllLocations } from '@/lib/finance/inventory-utils'

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
    const supplierId = searchParams.get('supplierId')
    const locationId = searchParams.get('locationId')
    const includeStock = searchParams.get('includeStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.ItemMasterWhereInput = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (locationId) {
      where.locationId = locationId
    }

    if (search) {
      where.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.itemMaster.findMany({
        where,
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
        },
        orderBy: { itemCode: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.itemMaster.count({ where }),
    ])

    // Calculate current stock for each item if requested
    let itemsWithStock = items
    if (includeStock) {
      itemsWithStock = await Promise.all(
        items.map(async (item) => {
          const currentStock = await getItemStockAllLocations(item.id)
          return {
            ...item,
            currentStock,
          }
        })
      )
    }

    return successResponse({
      data: itemsWithStock,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    return errorResponse('Failed to fetch items', 500)
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
    const {
      name,
      price,
      unit,
      supplierId,
      locationId,
      minimumStockLevel,
      maximumStockLevel,
      description,
    } = body

    if (!name || price === undefined || !unit || !supplierId || !locationId) {
      return errorResponse('Name, price, unit, supplier, and location are required', 400)
    }

    if (price < 0) {
      return errorResponse('Price cannot be negative', 400)
    }

    if (minimumStockLevel !== undefined && minimumStockLevel < 0) {
      return errorResponse('Minimum stock level cannot be negative', 400)
    }

    if (maximumStockLevel !== undefined && maximumStockLevel < 0) {
      return errorResponse('Maximum stock level cannot be negative', 400)
    }

    if (
      minimumStockLevel !== undefined &&
      maximumStockLevel !== undefined &&
      minimumStockLevel > maximumStockLevel
    ) {
      return errorResponse('Minimum stock level cannot be greater than maximum stock level', 400)
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

    // Generate item code
    const itemCode = await generateItemCode()

    const item = await prisma.itemMaster.create({
      data: {
        itemCode,
        name,
        price,
        unit,
        supplierId,
        locationId,
        minimumStockLevel: minimumStockLevel ?? 0,
        maximumStockLevel: maximumStockLevel ?? 0,
        description,
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

    return successResponse(item, 'Item created successfully')
  } catch (error) {
    console.error('Error creating item:', error)
    return errorResponse('Failed to create item', 500)
  }
}
