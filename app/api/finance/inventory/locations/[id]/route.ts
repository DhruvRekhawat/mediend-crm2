import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LocationType } from '@prisma/client'

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

    const location = await prisma.locationMaster.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            items: true,
            purchases: true,
            issues: true,
          },
        },
      },
    })

    if (!location) {
      return errorResponse('Location not found', 404)
    }

    return successResponse(location)
  } catch (error) {
    console.error('Error fetching location:', error)
    return errorResponse('Failed to fetch location', 500)
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
    const { name, code, type, parentId, description, isActive } = body

    const existing = await prisma.locationMaster.findUnique({
      where: { id },
      include: {
        children: true,
        items: true,
      },
    })

    if (!existing) {
      return errorResponse('Location not found', 404)
    }

    // Validate type change
    if (type && type !== existing.type) {
      // Cannot change type if it has children or items
      if (existing.children.length > 0) {
        return errorResponse('Cannot change type of location with sub-warehouses', 400)
      }
      if (existing.items.length > 0) {
        return errorResponse('Cannot change type of location with items', 400)
      }
    }

    // Validate parent changes
    if (parentId !== undefined) {
      if (existing.type === LocationType.WAREHOUSE && parentId !== null) {
        return errorResponse('Warehouse cannot have a parent', 400)
      }

      if (existing.type === LocationType.SUB_WAREHOUSE) {
        if (parentId === null) {
          return errorResponse('Sub-warehouse must have a parent', 400)
        }

        if (parentId === id) {
          return errorResponse('Location cannot be its own parent', 400)
        }

        // Check for circular reference
        const parent = await prisma.locationMaster.findUnique({
          where: { id: parentId },
          include: {
            parent: true,
          },
        })

        if (!parent) {
          return errorResponse('Parent location not found', 404)
        }

        if (parent.type !== LocationType.WAREHOUSE) {
          return errorResponse('Sub-warehouse can only be under a warehouse', 400)
        }
      }
    }

    // Check for duplicate code if code is being changed
    if (code && code !== existing.code) {
      const duplicate = await prisma.locationMaster.findUnique({
        where: { code },
      })
      if (duplicate) {
        return errorResponse('Location with this code already exists', 400)
      }
    }

    const location = await prisma.locationMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(type !== undefined && { type }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
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

    return successResponse(location, 'Location updated successfully')
  } catch (error) {
    console.error('Error updating location:', error)
    return errorResponse('Failed to update location', 500)
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

    const location = await prisma.locationMaster.findUnique({
      where: { id },
      include: {
        children: true,
        items: true,
        purchases: true,
        issues: true,
      },
    })

    if (!location) {
      return errorResponse('Location not found', 404)
    }

    // Check if location has children
    if (location.children.length > 0) {
      return errorResponse(
        'Cannot delete location with sub-warehouses. Delete or move sub-warehouses first.',
        400
      )
    }

    // Check if location has items
    if (location.items.length > 0) {
      return errorResponse(
        'Cannot delete location with items. Deactivate it instead.',
        400
      )
    }

    // Check if location has transactions
    if (location.purchases.length > 0 || location.issues.length > 0) {
      return errorResponse(
        'Cannot delete location with transactions. Deactivate it instead.',
        400
      )
    }

    await prisma.locationMaster.delete({
      where: { id },
    })

    return successResponse(null, 'Location deleted successfully')
  } catch (error) {
    console.error('Error deleting location:', error)
    return errorResponse('Failed to delete location', 500)
  }
}
