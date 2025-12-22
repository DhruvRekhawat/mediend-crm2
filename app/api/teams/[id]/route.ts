import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  circle: z.enum(['North', 'South', 'East', 'West', 'Central']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: teamId } = await params

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        salesHead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            _count: {
              select: {
                assignedLeads: true,
              },
            },
          },
        },
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    // Verify user can manage this team
    if (!canManageTeam(user, team.salesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    // Get leads assigned to team members
    const teamBdIds = team.members.map((m) => m.id)
    const leads = await prisma.lead.findMany({
      where: {
        bdId: { in: teamBdIds },
      },
      include: {
        bd: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedDate: 'desc',
      },
      take: 100, // Limit for performance
    })

    // Get lead statistics
    const leadStats = await prisma.lead.groupBy({
      by: ['pipelineStage', 'status'],
      where: {
        bdId: { in: teamBdIds },
      },
      _count: {
        id: true,
      },
    })

    return successResponse({
      ...team,
      leads,
      leadStats,
    })
  } catch (error) {
    console.error('Error fetching team details:', error)
    return errorResponse('Failed to fetch team details', 500)
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

    if (!hasPermission(user, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: teamId } = await params
    const body = await request.json()
    const data = updateTeamSchema.parse(body)

    // Get team to verify sales head
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        salesHeadId: true,
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    if (!canManageTeam(user, team.salesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        salesHead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return successResponse(updatedTeam, 'Team updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating team:', error)
    return errorResponse('Failed to update team', 500)
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

    if (!hasPermission(user, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: teamId } = await params

    // Get team to verify sales head
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    if (!canManageTeam(user, team.salesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    if (team.members.length > 0) {
      return errorResponse('Cannot delete team with members. Please remove all members first.', 400)
    }

    await prisma.team.delete({
      where: { id: teamId },
    })

    return successResponse(null, 'Team deleted successfully')
  } catch (error) {
    console.error('Error deleting team:', error)
    return errorResponse('Failed to delete team', 500)
  }
}

