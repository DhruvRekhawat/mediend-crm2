import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LocationType, Prisma } from '@prisma/client'

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
    const type = searchParams.get('type') as LocationType | null
    const parentId = searchParams.get('parentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeChildren = searchParams.get('includeChildren') === 'true'

    const where: Prisma.LocationMasterWhereInput = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (type) {
      where.type = type
    }

    if (parentId) {
      where.parentId = parentId
    } else if (parentId === 'null') {
      // Explicitly get root locations (warehouses without parent)
      where.parentId = null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [locations, total] = await Promise.all([
      prisma.locationMaster.findMany({
        where,
        include: {
          parent: includeChildren ? {
            select: {
              id: true,
              name: true,
              code: true,
            },
          } : false,
          children: includeChildren ? {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          } : false,
          _count: {
            select: {
              items: true,
              purchases: true,
              issues: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.locationMaster.count({ where }),
    ])

    return successResponse({
      data: locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return errorResponse('Failed to fetch locations', 500)
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
    const { name, code, type, parentId, description } = body

    if (!name || !code || !type) {
      return errorResponse('Name, code, and type are required', 400)
    }

    // Validate location type
    const validTypes = LocationType ? Object.values(LocationType) : ['WAREHOUSE', 'SUB_WAREHOUSE']
    if (!validTypes.includes(type)) {
      return errorResponse('Invalid location type. Must be WAREHOUSE or SUB_WAREHOUSE', 400)
    }

    // Validate parent if this is a sub-warehouse
    if (type === LocationType.SUB_WAREHOUSE) {
      if (!parentId) {
        return errorResponse('Parent location is required for sub-warehouse', 400)
      }

      const parent = await prisma.locationMaster.findUnique({
        where: { id: parentId },
      })

      if (!parent) {
        return errorResponse('Parent location not found', 404)
      }

      if (parent.type !== LocationType.WAREHOUSE) {
        return errorResponse('Sub-warehouse can only be created under a warehouse', 400)
      }

      if (!parent.isActive) {
        return errorResponse('Parent location is not active', 400)
      }
    } else if (parentId) {
      return errorResponse('Warehouse cannot have a parent', 400)
    }

    // Check for duplicate code
    const existing = await prisma.locationMaster.findUnique({
      where: { code },
    })

    if (existing) {
      return errorResponse('Location with this code already exists', 400)
    }

    const location = await prisma.locationMaster.create({
      data: {
        name,
        code,
        type,
        parentId: type === LocationType.SUB_WAREHOUSE ? parentId : null,
        description,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return successResponse(location, 'Location created successfully')
  } catch (error) {
    console.error('Error creating location:', error)
    return errorResponse('Failed to create location', 500)
  }
}
