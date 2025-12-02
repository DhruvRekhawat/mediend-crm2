import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1),
  circle: z.enum(['North', 'South', 'East', 'West', 'Central']),
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

    const teams = await prisma.team.findMany({
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

    const team = await prisma.team.create({
      data: {
        name: data.name,
        circle: data.circle,
        salesHeadId: data.salesHeadId,
      },
      include: {
        salesHead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse(team, 'Team created successfully')
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating team:', error)
    return errorResponse('Failed to create team', 500)
  }
}

