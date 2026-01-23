import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { InventoryTransactionStatus, Prisma, StockMovementType } from '@prisma/client'
import { generateIssueNumber, updateItemStock, validateStockForIssue, checkStockLevels } from '@/lib/finance/inventory-utils'

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
    const locationId = searchParams.get('locationId')
    const issuedToId = searchParams.get('issuedToId')
    const status = searchParams.get('status') as InventoryTransactionStatus | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.IssueTransactionWhereInput = {}

    if (itemId) {
      where.itemId = itemId
    }

    if (locationId) {
      where.locationId = locationId
    }

    if (issuedToId) {
      where.issuedToId = issuedToId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.issueDate = {}
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`)
        where.issueDate.gte = start
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`)
        where.issueDate.lte = end
      }
    }

    const [issues, total] = await Promise.all([
      prisma.issueTransaction.findMany({
        where,
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
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issueTransaction.count({ where }),
    ])

    return successResponse({
      data: issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching issues:', error)
    return errorResponse('Failed to fetch issues', 500)
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
      locationId,
      quantity,
      issuedToId,
      issueDate,
      description,
    } = body

    if (!itemId || !locationId || !quantity || !issuedToId) {
      return errorResponse('Item, location, quantity, and issued to are required', 400)
    }

    if (quantity <= 0) {
      return errorResponse('Quantity must be greater than 0', 400)
    }

    // Validate item exists and is active
    const item = await prisma.itemMaster.findUnique({
      where: { id: itemId },
    })

    if (!item || !item.isActive) {
      return errorResponse('Invalid or inactive item', 400)
    }

    // Validate location exists and is active
    const location = await prisma.locationMaster.findUnique({
      where: { id: locationId },
    })

    if (!location || !location.isActive) {
      return errorResponse('Invalid or inactive location', 400)
    }

    // Validate issued to user exists
    const issuedTo = await prisma.user.findUnique({
      where: { id: issuedToId },
    })

    if (!issuedTo) {
      return errorResponse('Invalid user', 400)
    }

    // Validate sufficient stock
    const stockValidation = await validateStockForIssue(itemId, locationId, quantity)
    if (!stockValidation.isValid) {
      return errorResponse(stockValidation.message || 'Insufficient stock', 400)
    }

    // Use item's current price as unit price
    const unitPrice = item.price
    const totalPrice = quantity * unitPrice

    // Generate issue number
    const issueNumber = await generateIssueNumber()

    // Create issue transaction
    const issue = await prisma.issueTransaction.create({
      data: {
        issueNumber,
        itemId,
        locationId,
        quantity,
        unitPrice,
        totalPrice,
        issuedToId,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        description,
        status: InventoryTransactionStatus.COMPLETED, // Auto-complete issues
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

    // Create stock movement (negative quantity for issue)
    await updateItemStock(
      itemId,
      locationId,
      -quantity, // Negative for issues
      StockMovementType.ISSUE,
      issue.id,
      user.id
    )

    // Check stock levels for alerts
    const stockStatus = await checkStockLevels(itemId, locationId)

    return successResponse(
      {
        ...issue,
        stockStatus,
      },
      'Issue created successfully'
    )
  } catch (error) {
    console.error('Error creating issue:', error)
    return errorResponse('Failed to create issue', 500)
  }
}
