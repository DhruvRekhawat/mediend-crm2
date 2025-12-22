import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const removeBdsSchema = z.object({
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
    const { bdIds } = removeBdsSchema.parse(body)

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

    // Verify all BDs are actually in this team
    const bds = await prisma.user.findMany({
      where: {
        id: { in: bdIds },
        role: 'BD',
        teamId: teamId,
      },
    })

    if (bds.length !== bdIds.length) {
      return errorResponse('Some BDs not found in this team', 400)
    }

    // Remove BDs from the team (set teamId to null)
    await prisma.user.updateMany({
      where: {
        id: { in: bdIds },
      },
      data: {
        teamId: null,
      },
    })

    return successResponse(null, 'BDs removed from team successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error removing BDs from team:', error)
    return errorResponse('Failed to remove BDs from team', 500)
  }
}

