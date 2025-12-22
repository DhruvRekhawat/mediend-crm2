import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const assignLeadsSchema = z.object({
  leadIds: z.array(z.string()).min(1),
  distributionType: z.enum(['equal', 'manual']).optional().default('equal'),
  bdAssignments: z.record(z.string(), z.string()).optional(), // leadId -> bdId for manual distribution
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

    if (!hasPermission(user, 'leads:assign')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: teamId } = await params
    const body = await request.json()
    const { leadIds, distributionType, bdAssignments } = assignLeadsSchema.parse(body)

    // Get team to verify sales head and get team members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        salesHead: {
          select: {
            id: true,
          },
        },
        members: {
          where: {
            role: 'BD',
          },
          select: {
            id: true,
            name: true,
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

    if (team.members.length === 0) {
      return errorResponse('Team has no BDs. Please assign BDs to the team first.', 400)
    }

    // Verify all leads exist
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
      },
    })

    if (leads.length !== leadIds.length) {
      return errorResponse('Some leads not found', 400)
    }

    // Assign leads based on distribution type
    if (distributionType === 'manual' && bdAssignments) {
      // Manual assignment: assign each lead to specified BD
      for (const [leadId, bdId] of Object.entries(bdAssignments)) {
        // Verify BD is in the team
        if (!team.members.some((m) => m.id === bdId)) {
          return errorResponse(`BD ${bdId} is not a member of this team`, 400)
        }

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            bdId: bdId,
            updatedById: user.id,
          },
        })
      }
    } else {
      // Equal distribution: round-robin assignment
      const bdIds = team.members.map((m) => m.id)
      let bdIndex = 0

      for (const leadId of leadIds) {
        const bdId = bdIds[bdIndex % bdIds.length]
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            bdId: bdId,
            updatedById: user.id,
          },
        })
        bdIndex++
      }
    }

    return successResponse(null, 'Leads assigned to team successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error assigning leads to team:', error)
    return errorResponse('Failed to assign leads to team', 500)
  }
}

