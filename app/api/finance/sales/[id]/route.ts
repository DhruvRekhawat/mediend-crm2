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

    const entry = await prisma.salesEntry.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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

    if (!entry) {
      return errorResponse('Sales entry not found', 404)
    }

    if (entry.isDeleted) {
      return errorResponse('Sales entry has been deleted', 404)
    }

    return successResponse(entry)
  } catch (error) {
    console.error('Error fetching sales entry:', error)
    return errorResponse('Failed to fetch sales entry', 500)
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
    const { transactionDate, projectId, description, amount, notes } = body

    // Check if entry exists and is not deleted
    const existing = await prisma.salesEntry.findUnique({
      where: { id },
    })

    if (!existing || existing.isDeleted) {
      return errorResponse('Sales entry not found', 404)
    }

    // Validate amount if provided
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return errorResponse('Amount must be a positive number', 400)
      }
    }

    // Validate project if provided
    if (projectId) {
      const project = await prisma.projectMaster.findUnique({
        where: { id: projectId },
      })
      if (!project || !project.isActive) {
        return errorResponse('Invalid or inactive project', 400)
      }
    }

    // Update entry
    const updated = await prisma.salesEntry.update({
      where: { id },
      data: {
        ...(transactionDate && { transactionDate: new Date(transactionDate) }),
        ...(projectId && { projectId }),
        ...(description && { description }),
        ...(amount !== undefined && { amount }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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

    return successResponse(updated, 'Sales entry updated successfully')
  } catch (error) {
    console.error('Error updating sales entry:', error)
    return errorResponse('Failed to update sales entry', 500)
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

    // Check if entry exists and is not already deleted
    const existing = await prisma.salesEntry.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Sales entry not found', 404)
    }

    if (existing.isDeleted) {
      return errorResponse('Sales entry already deleted', 400)
    }

    // Soft delete
    await prisma.salesEntry.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return successResponse(null, 'Sales entry deleted successfully')
  } catch (error) {
    console.error('Error deleting sales entry:', error)
    return errorResponse('Failed to delete sales entry', 500)
  }
}
