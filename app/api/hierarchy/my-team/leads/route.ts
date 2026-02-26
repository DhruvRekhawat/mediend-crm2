import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getEmployeeByUserId, getSubordinates } from '@/lib/hierarchy'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hierarchy:team:read')) {
      return errorResponse('Forbidden', 403)
    }

    const employee = await getEmployeeByUserId(user.id)
    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const subordinates = await getSubordinates(employee.id, true)
    const subordinateUserIds = subordinates.map((s) => s.userId)
    if (subordinateUserIds.length === 0) {
      return successResponse({ leads: [], byBd: {} })
    }

    const leads = await prisma.lead.findMany({
      where: { bdId: { in: subordinateUserIds } },
      select: {
        id: true,
        leadRef: true,
        patientName: true,
        bdId: true,
        status: true,
        pipelineStage: true,
        caseStage: true,
        createdDate: true,
      },
      orderBy: { createdDate: 'desc' },
      take: 500,
    })

    const byBd: Record<string, number> = {}
    for (const uid of subordinateUserIds) {
      byBd[uid] = leads.filter((l) => l.bdId === uid).length
    }

    return successResponse({
      leads,
      byBd,
      total: leads.length,
    })
  } catch (error) {
    console.error('Error fetching team leads:', error)
    return errorResponse('Failed to fetch team leads', 500)
  }
}
