import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, Circle } from '@prisma/client'
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

    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const baseWhere: Prisma.LeadWhereInput = {
      createdDate: dateFilter,
    }

    // Role-based filtering
    if (user.role === 'BD') {
      baseWhere.bdId = user.id
    } else if (user.role === 'TEAM_LEAD' && user.teamId) {
      baseWhere.bd = {
        teamId: user.teamId,
      }
    }

    const completedWhere: Prisma.LeadWhereInput = {
      ...baseWhere,
      pipelineStage: 'COMPLETED',
      conversionDate: dateFilter,
    }

    // Circle Performance
    const circleStats = await prisma.lead.groupBy({
      by: ['circle'],
      where: baseWhere,
      _count: { id: true },
    })

    const circleCompleted = await prisma.lead.groupBy({
      by: ['circle'],
      where: completedWhere,
      _count: { id: true },
      _sum: {
        billAmount: true,
        netProfit: true,
      },
    })

    const circleMap = new Map<Circle, { totalLeads: number; completed: number; revenue: number; profit: number }>()
    
    circleStats.forEach((stat) => {
      circleMap.set(stat.circle, {
        totalLeads: stat._count.id,
        completed: 0,
        revenue: 0,
        profit: 0,
      })
    })

    circleCompleted.forEach((stat) => {
      const existing = circleMap.get(stat.circle) || { totalLeads: 0, completed: 0, revenue: 0, profit: 0 }
      existing.completed = stat._count.id
      existing.revenue = stat._sum.billAmount || 0
      existing.profit = stat._sum.netProfit || 0
      circleMap.set(stat.circle, existing)
    })

    const circlePerformance = Array.from(circleMap.entries()).map(([circle, data]) => {
      const conversionRate = data.totalLeads > 0 ? (data.completed / data.totalLeads) * 100 : 0
      const avgTicketSize = data.completed > 0 ? data.revenue / data.completed : 0

      return {
        circle,
        totalLeads: data.totalLeads,
        completedSurgeries: data.completed,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue: data.revenue,
        profit: data.profit,
        avgTicketSize: Math.round(avgTicketSize * 100) / 100,
      }
    })

    // City Performance
    const cityStats = await prisma.lead.groupBy({
      by: ['city', 'circle'],
      where: baseWhere,
      _count: { id: true },
    })

    const cityCompleted = await prisma.lead.groupBy({
      by: ['city', 'circle'],
      where: completedWhere,
      _count: { id: true },
      _sum: {
        billAmount: true,
        netProfit: true,
      },
    })

    const cityMap = new Map<
      string,
      {
        circle: Circle
        totalLeads: number
        completed: number
        revenue: number
        profit: number
        topHospital: string
        topTreatment: string
      }
    >()

    cityStats.forEach((stat) => {
      cityMap.set(stat.city, {
        circle: stat.circle,
        totalLeads: stat._count.id,
        completed: 0,
        revenue: 0,
        profit: 0,
        topHospital: '',
        topTreatment: '',
      })
    })

    cityCompleted.forEach((stat) => {
      const existing = cityMap.get(stat.city) || {
        circle: stat.circle,
        totalLeads: 0,
        completed: 0,
        revenue: 0,
        profit: 0,
        topHospital: '',
        topTreatment: '',
      }
      existing.completed = stat._count.id
      existing.revenue = stat._sum.billAmount || 0
      existing.profit = stat._sum.netProfit || 0
      cityMap.set(stat.city, existing)
    })

    // Get top hospital and treatment for each city
    for (const [city, data] of cityMap.entries()) {
      const cityLeads = await prisma.lead.findMany({
        where: { ...completedWhere, city },
        select: { hospitalName: true, treatment: true },
      })

      const hospitalCounts = new Map<string, number>()
      const treatmentCounts = new Map<string, number>()

      cityLeads.forEach((lead) => {
        if (lead.hospitalName) {
          hospitalCounts.set(lead.hospitalName, (hospitalCounts.get(lead.hospitalName) || 0) + 1)
        }
        if (lead.treatment) {
          treatmentCounts.set(lead.treatment, (treatmentCounts.get(lead.treatment) || 0) + 1)
        }
      })

      const topHospital = Array.from(hospitalCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      const topTreatment = Array.from(treatmentCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

      data.topHospital = topHospital
      data.topTreatment = topTreatment
    }

    const cityPerformance = Array.from(cityMap.entries())
      .map(([city, data]) => {
        const conversionRate = data.totalLeads > 0 ? (data.completed / data.totalLeads) * 100 : 0
        const avgTicketSize = data.completed > 0 ? data.revenue / data.completed : 0

        return {
          city,
          circle: data.circle,
          totalLeads: data.totalLeads,
          completedSurgeries: data.completed,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenue: data.revenue,
          profit: data.profit,
          avgTicketSize: Math.round(avgTicketSize * 100) / 100,
          topHospital: data.topHospital,
          topTreatment: data.topTreatment,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20) // Top 20 cities

    return successResponse({
      circlePerformance,
      cityPerformance,
    })
  } catch (error) {
    console.error('Error fetching geographic analytics:', error)
    return errorResponse('Failed to fetch geographic analytics', 500)
  }
}
