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

    if (!hasPermission(user, 'users:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const salesHeadId = searchParams.get('salesHeadId')
    const unassignedOnly = searchParams.get('unassignedOnly') === 'true'

    const where: any = {
      role: 'BD',
    }

    // If salesHeadId is provided, filter BDs by teams managed by that sales head
    if (salesHeadId) {
      if (!canManageTeam(user, salesHeadId)) {
        return errorResponse('Forbidden', 403)
      }
      
      if (unassignedOnly) {
        // Get BDs without teams
        where.teamId = null
      } else {
        // Get BDs from teams managed by this sales head, or unassigned BDs
        where.OR = [
          {
            team: {
              salesHeadId: salesHeadId,
            },
          },
          {
            teamId: null,
          },
        ]
      }
    }

    const bds = await prisma.user.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            circle: true,
            salesHead: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedLeads: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse(bds)
  } catch (error) {
    console.error('Error fetching BDs:', error)
    return errorResponse('Failed to fetch BDs', 500)
  }
}

