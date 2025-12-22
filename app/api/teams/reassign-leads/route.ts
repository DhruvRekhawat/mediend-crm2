import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const reassignLeadsSchema = z.object({
  leadIds: z.array(z.string()).min(1),
  targetTeamId: z.string(),
  distributionType: z.enum(['equal', 'manual']).optional().default('equal'),
  bdAssignments: z.record(z.string(), z.string()).optional(), // leadId -> bdId for manual distribution
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:assign')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { leadIds, targetTeamId, distributionType, bdAssignments } = reassignLeadsSchema.parse(body)

    // Get target team to verify sales head and get team members
    const targetTeam = await prisma.team.findUnique({
      where: { id: targetTeamId },
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

    if (!targetTeam) {
      return errorResponse('Target team not found', 404)
    }

    if (!canManageTeam(user, targetTeam.salesHeadId)) {
      return errorResponse('Forbidden', 403)
    }

    if (targetTeam.members.length === 0) {
      return errorResponse('Target team has no BDs. Please assign BDs to the team first.', 400)
    }

    // Verify all leads exist
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
      },
      include: {
        bd: {
          select: {
            teamId: true,
          },
        },
      },
    })

    if (leads.length !== leadIds.length) {
      return errorResponse('Some leads not found', 400)
    }

    // Verify user can manage the teams these leads belong to
    for (const lead of leads) {
      if (lead.bd.teamId) {
        const sourceTeam = await prisma.team.findUnique({
          where: { id: lead.bd.teamId },
          select: { salesHeadId: true },
        })
        if (sourceTeam && !canManageTeam(user, sourceTeam.salesHeadId)) {
          return errorResponse(`You don't have permission to reassign leads from team ${lead.bd.teamId}`, 403)
        }
      }
    }

    // Assign leads based on distribution type
    if (distributionType === 'manual' && bdAssignments) {
      // Manual assignment: assign each lead to specified BD
      for (const [leadId, bdId] of Object.entries(bdAssignments)) {
        // Verify BD is in the target team
        if (!targetTeam.members.some((m) => m.id === bdId)) {
          return errorResponse(`BD ${bdId} is not a member of the target team`, 400)
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
      const bdIds = targetTeam.members.map((m) => m.id)
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

    return successResponse(null, 'Leads reassigned successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error reassigning leads:', error)
    return errorResponse('Failed to reassign leads', 500)
  }
}

