import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1),
  teamLeadId: z.string().nullable().optional(),
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

    if (!hasPermission(user, 'hrms:employees:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: departmentId } = await params

    const teams = await prisma.departmentTeam.findMany({
      where: { departmentId },
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
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse(teams)
  } catch (error) {
    console.error('Error fetching department teams:', error)
    return errorResponse('Failed to fetch department teams', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: departmentId } = await params
    const body = await request.json()
    const { name, teamLeadId } = createTeamSchema.parse(body)

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      return errorResponse('Department not found', 404)
    }

    // If teamLeadId is provided, validate it
    if (teamLeadId) {
      const teamLead = await prisma.employee.findUnique({
        where: { id: teamLeadId },
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
      const existingTeamLead = await prisma.departmentTeam.findUnique({
        where: { teamLeadId },
      })

      if (existingTeamLead) {
        return errorResponse('This employee is already a team lead of another team', 400)
      }
    }

    const team = await prisma.departmentTeam.create({
      data: {
        name,
        departmentId,
        teamLeadId: teamLeadId || null,
      },
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

    return successResponse(team, 'Team created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating team:', error)
    return errorResponse('Failed to create team', 500)
  }
}
