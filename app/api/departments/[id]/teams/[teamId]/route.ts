import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  teamLeadId: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: departmentId, teamId } = await params
    const body = await request.json()
    const data = updateTeamSchema.parse(body)

    // Verify team exists and belongs to department
    const team = await prisma.departmentTeam.findFirst({
      where: {
        id: teamId,
        departmentId,
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    // If teamLeadId is being updated, validate it
    if (data.teamLeadId !== undefined) {
      if (data.teamLeadId) {
        const teamLead = await prisma.employee.findUnique({
          where: { id: data.teamLeadId },
          include: {
            department: {
              select: {
                id: true,
              },
            },
          },
        })

        if (!teamLead) {
          return errorResponse('Team lead not found', 404)
        }

        if (teamLead.departmentId !== departmentId) {
          return errorResponse('Team lead must be in the same department', 400)
        }

        // Check if employee is already a team lead of another team
        const existingTeamLead = await prisma.departmentTeam.findFirst({
          where: {
            teamLeadId: data.teamLeadId,
            id: { not: teamId },
          },
        })

        if (existingTeamLead) {
          return errorResponse('This employee is already a team lead of another team', 400)
        }
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.teamLeadId !== undefined) {
      updateData.teamLeadId = data.teamLeadId || null
    }

    const updated = await prisma.departmentTeam.update({
      where: { id: teamId },
      data: updateData,
      include: {
        teamLead: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    return successResponse(updated, 'Team updated successfully')
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
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: departmentId, teamId } = await params

    // Verify team exists and belongs to department
    const team = await prisma.departmentTeam.findFirst({
      where: {
        id: teamId,
        departmentId,
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    // Remove team assignments from all members
    await prisma.employee.updateMany({
      where: {
        teamId: teamId,
      },
      data: {
        teamId: null,
      },
    })

    // Delete the team
    await prisma.departmentTeam.delete({
      where: { id: teamId },
    })

    return successResponse(null, 'Team deleted successfully')
  } catch (error) {
    console.error('Error deleting team:', error)
    return errorResponse('Failed to delete team', 500)
  }
}
