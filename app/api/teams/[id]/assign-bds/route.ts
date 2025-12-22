import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const assignBdsSchema = z.object({
  bdIds: z.array(z.string()).min(1),
})

export async function POST(
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
    const { bdIds } = assignBdsSchema.parse(body)

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

    // Verify all BDs exist and are actually BDs
    const bds = await prisma.user.findMany({
      where: {
        id: { in: bdIds },
        role: 'BD',
      },
    })

    if (bds.length !== bdIds.length) {
      return errorResponse('Some BDs not found or invalid', 400)
    }

    // Update BDs to assign them to the team
    await prisma.user.updateMany({
      where: {
        id: { in: bdIds },
      },
      data: {
        teamId: teamId,
      },
    })

    // Fetch updated team with members
    const updatedTeam = await prisma.team.findUnique({
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
          },
        },
      },
    })

    return successResponse(updatedTeam, 'BDs assigned to team successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error assigning BDs to team:', error)
    return errorResponse('Failed to assign BDs to team', 500)
  }
}

