import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1).optional(),
  teamLeadId: z.string().optional(),
  salesHeadId: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const salesHeadId = searchParams.get('salesHeadId')

    const where: any = {}

    // Sales heads can only see their own teams (unless they're MD or ADMIN)
    if (user.role === 'SALES_HEAD' && !salesHeadId) {
      where.salesHeadId = user.id
    } else if (salesHeadId) {
      // If salesHeadId is provided, verify user can manage it
      if (!canManageTeam(user, salesHeadId)) {
        return errorResponse('Forbidden', 403)
      }
      where.salesHeadId = salesHeadId
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        salesHead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teamLead: {
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
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return errorResponse('Failed to fetch teams', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = createTeamSchema.parse(body)

    // Verify user can manage this team
    if (!canManageTeam(user, data.salesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    let name = data.name
    if (!name && data.teamLeadId) {
      const teamLead = await prisma.user.findUnique({
        where: { id: data.teamLeadId },
        select: { name: true },
      })
      name = teamLead ? `Team ${teamLead.name}` : 'New Team'
    }
    if (!name) {
      name = 'New Team'
    }

    const team = await prisma.team.create({
      data: {
        name,
        salesHeadId: data.salesHeadId,
        teamLeadId: data.teamLeadId ?? undefined,
      },
      include: {
        salesHead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
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

