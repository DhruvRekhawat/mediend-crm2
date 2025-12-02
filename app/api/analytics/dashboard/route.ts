import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'analytics:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const circle = searchParams.get('circle')
    const city = searchParams.get('city')

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const where: any = {
      pipelineStage: 'COMPLETED',
      conversionDate: dateFilter,
    }

    if (circle) where.circle = circle
    if (city) where.city = city

    // Role-based filtering
    if (user.role === 'BD') {
      where.bdId = user.id
    } else if (user.role === 'TEAM_LEAD' && user.teamId) {
      where.bd = {
        teamId: user.teamId,
      }
    }

    const [totalSurgeries, totalProfit, avgTicketSize, totalLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.aggregate({
        where,
        _sum: {
          netProfit: true,
        },
      }),
      prisma.lead.aggregate({
        where,
        _avg: {
          ticketSize: true,
        },
      }),
      prisma.lead.count({
        where: {
          ...where,
          pipelineStage: undefined,
          conversionDate: undefined,
          createdDate: dateFilter,
        },
      }),
    ])

    const conversionRate = totalLeads > 0 ? (totalSurgeries / totalLeads) * 100 : 0

    return successResponse({
      totalSurgeries,
      totalProfit: totalProfit._sum.netProfit || 0,
      avgTicketSize: avgTicketSize._avg.ticketSize || 0,
      totalLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
    })
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return errorResponse('Failed to fetch analytics', 500)
  }
}

