import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canManageTeam } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const autoAssignSchema = z.object({
  circle: z.enum(['North', 'South', 'East', 'West', 'Central']).optional(),
  unassignedOnly: z.boolean().optional().default(true),
  maxLeadsPerBd: z.number().optional(),
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
    const { circle, unassignedOnly, maxLeadsPerBd } = autoAssignSchema.parse(body)

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

    // Build query for unassigned leads
    const leadWhere: any = {
      pipelineStage: 'SALES',
    }

    if (circle) {
      leadWhere.circle = circle
    } else {
      // Use team's circle if no circle specified
      const teamWithCircle = await prisma.team.findUnique({
        where: { id: teamId },
        select: { circle: true },
      })
      if (teamWithCircle) {
        leadWhere.circle = teamWithCircle.circle
      }
    }

    if (unassignedOnly) {
      // Get leads that are not assigned to any BD in this team
      const teamBdIds = team.members.map((m) => m.id)
      leadWhere.NOT = {
        bdId: { in: teamBdIds },
      }
    } else {
      // Get all leads matching the criteria
      // We'll reassign them
    }

    // Get available leads
    const availableLeads = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        bdId: true,
      },
      take: maxLeadsPerBd ? maxLeadsPerBd * team.members.length : undefined,
    })

    if (availableLeads.length === 0) {
      return successResponse({ assigned: 0 }, 'No leads available for assignment')
    }

    // Get current lead counts per BD for balanced distribution
    const bdLeadCounts = await prisma.lead.groupBy({
      by: ['bdId'],
      where: {
        bdId: { in: team.members.map((m) => m.id) },
        pipelineStage: 'SALES',
      },
      _count: {
        id: true,
      },
    })

    const leadCountMap = new Map(bdLeadCounts.map((item) => [item.bdId, item._count.id]))

    // Sort BDs by current lead count (ascending) for balanced distribution
    const sortedBds = [...team.members].sort((a, b) => {
      const countA = leadCountMap.get(a.id) || 0
      const countB = leadCountMap.get(b.id) || 0
      return countA - countB
    })

    // Assign leads round-robin starting with BD with least leads
    let assignedCount = 0
    let bdIndex = 0

    for (const lead of availableLeads) {
      const bdId = sortedBds[bdIndex % sortedBds.length].id
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          bdId: bdId,
          updatedById: user.id,
        },
      })
      assignedCount++
      bdIndex++
    }

    return successResponse(
      { assigned: assignedCount },
      `Successfully auto-assigned ${assignedCount} leads to team`
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error auto-assigning leads:', error)
    return errorResponse('Failed to auto-assign leads', 500)
  }
}

