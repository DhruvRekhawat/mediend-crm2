import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

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

    const head = await prisma.headMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    })

    if (!head) {
      return errorResponse('Head not found', 404)
    }

    return successResponse(head)
  } catch (error) {
    console.error('Error fetching head:', error)
    return errorResponse('Failed to fetch head', 500)
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
    const { name, department, description, isActive } = body

    const existing = await prisma.headMaster.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Head not found', 404)
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.headMaster.findUnique({
        where: { name },
      })
      if (duplicate) {
        return errorResponse('Head with this name already exists', 400)
      }
    }

    const head = await prisma.headMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return successResponse(head, 'Head updated successfully')
  } catch (error) {
    console.error('Error updating head:', error)
    return errorResponse('Failed to update head', 500)
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

    // Check if head has any ledger entries
    const entriesCount = await prisma.ledgerEntry.count({
      where: { headId: id },
    })

    if (entriesCount > 0) {
      return errorResponse(
        'Cannot delete head with existing ledger entries. Deactivate it instead.',
        400
      )
    }

    await prisma.headMaster.delete({
      where: { id },
    })

    return successResponse(null, 'Head deleted successfully')
  } catch (error) {
    console.error('Error deleting head:', error)
    return errorResponse('Failed to delete head', 500)
  }
}

