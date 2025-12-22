import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
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

    if (!hasPermission(user, 'leads:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: teamId } = await params

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

    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        teamId: teamId,
        role: 'BD',
      },
      select: {
        id: true,
      },
    })

    const teamBdIds = teamMembers.map((m) => m.id)

    // Get all leads assigned to team members
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '1000')
    const circle = searchParams.get('circle')

    const where: any = {}

    if (teamBdIds.length > 0) {
      // If team has members, show leads from those BDs
      where.bdId = { in: teamBdIds }
    } else {
      // If team has no members, show leads by circle if circle matches
      if (circle) {
        const teamWithCircle = await prisma.team.findUnique({
          where: { id: teamId },
          select: { circle: true },
        })
        if (teamWithCircle && teamWithCircle.circle === circle) {
          where.circle = circle
          // Get all BDs managed by this sales head (even if not in team)
          const allBdsManaged = await prisma.user.findMany({
            where: {
              role: 'BD',
              OR: [
                { team: { salesHeadId: team.salesHeadId } },
                { teamId: null },
              ],
            },
            select: { id: true },
          })
          const allBdIds = allBdsManaged.map((bd) => bd.id)
          if (allBdIds.length > 0) {
            where.bdId = { in: allBdIds }
          } else {
            // No BDs found, return empty
            return successResponse([])
          }
        } else {
          // No members and circle doesn't match, return empty
          return successResponse([])
        }
      } else {
        // No members and no circle filter, return empty
        return successResponse([])
      }
    }

    // Add circle filter if provided
    if (circle) {
      where.circle = circle
    }

    const leads = await prisma.lead.findMany({
      where,
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
      take: limit,
    })

    return successResponse(leads)
  } catch (error) {
    console.error('Error fetching team leads:', error)
    return errorResponse('Failed to fetch team leads', 500)
  }
}

