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

    const project = await prisma.projectMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { salesEntries: true },
        },
      },
    })

    if (!project) {
      return errorResponse('Project not found', 404)
    }

    return successResponse(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return errorResponse('Failed to fetch project', 500)
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
    const { name, description, isActive } = body

    const existing = await prisma.projectMaster.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Project not found', 404)
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.projectMaster.findUnique({
        where: { name },
      })
      if (duplicate) {
        return errorResponse('Project with this name already exists', 400)
      }
    }

    const project = await prisma.projectMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return successResponse(project, 'Project updated successfully')
  } catch (error) {
    console.error('Error updating project:', error)
    return errorResponse('Failed to update project', 500)
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

    // Check if project has any sales entries
    const entriesCount = await prisma.salesEntry.count({
      where: { projectId: id },
    })

    if (entriesCount > 0) {
      return errorResponse(
        'Cannot delete project with existing sales entries. Deactivate it instead.',
        400
      )
    }

    await prisma.projectMaster.delete({
      where: { id },
    })

    return successResponse(null, 'Project deleted successfully')
  } catch (error) {
    console.error('Error deleting project:', error)
    return errorResponse('Failed to delete project', 500)
  }
}
