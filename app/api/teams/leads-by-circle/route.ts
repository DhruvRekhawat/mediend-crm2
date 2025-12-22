import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const circle = searchParams.get('circle')
    const salesHeadId = searchParams.get('salesHeadId')

    if (!circle) {
      return errorResponse('Circle parameter is required', 400)
    }

    // If salesHeadId is provided, verify user can manage it
    const targetSalesHeadId = salesHeadId || (user.role === 'SALES_HEAD' ? user.id : null)
    
    if (targetSalesHeadId && !canManageTeam(user, targetSalesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    // Get all teams managed by this sales head
    const teams = await prisma.team.findMany({
      where: {
        salesHeadId: targetSalesHeadId || undefined,
        circle: circle as any,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const teamIds = teams.map((t) => t.id)

    // Get all BDs from these teams
    const teamBds = await prisma.user.findMany({
      where: {
        role: 'BD',
        teamId: { in: teamIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const bdIds = teamBds.map((bd) => bd.id)

    if (bdIds.length === 0) {
      return successResponse([])
    }

    // Get all leads assigned to these BDs, filtered by circle
    const leads = await prisma.lead.findMany({
      where: {
        bdId: { in: bdIds },
        circle: circle as any,
        pipelineStage: 'SALES',
      },
      include: {
        bd: {
          select: {
            id: true,
            name: true,
            email: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedDate: 'desc',
      },
      take: 1000,
    })

    return successResponse(leads)
  } catch (error) {
    console.error('Error fetching leads by circle:', error)
    return errorResponse('Failed to fetch leads by circle', 500)
  }
}

