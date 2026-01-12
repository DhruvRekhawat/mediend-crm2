import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { mapStatusCode, mapSourceCode } from '@/lib/mysql-code-mappings'

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
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get all BD IDs that are assigned to teams
    const bdsWithTeams = await prisma.user.findMany({
      where: {
        role: 'BD',
        teamId: { not: null },
      },
      select: {
        id: true,
      },
    })

    const assignedBdIds = bdsWithTeams.map((bd) => bd.id)

    // Get unassigned leads (leads assigned to BDs without teams, or leads not assigned to any BD)
    // Actually, based on schema, all leads must have a bdId, so we'll get leads assigned to BDs without teams
    const where: any = {
      pipelineStage: 'SALES',
      bdId: { notIn: assignedBdIds },
    }

    if (circle) {
      where.circle = circle
    }

    const unassignedLeads = await prisma.lead.findMany({
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
        createdDate: 'desc',
      },
      take: limit,
    })

    // Map status and source codes to text values for display
    const mappedLeads = unassignedLeads.map((lead) => ({
      ...lead,
      status: mapStatusCode(lead.status),
      source: lead.source ? mapSourceCode(lead.source) : lead.source,
    }))

    return successResponse(mappedLeads)
  } catch (error) {
    console.error('Error fetching unassigned leads:', error)
    return errorResponse('Failed to fetch unassigned leads', 500)
  }
}

