import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

// Status codes that represent "cases closed" / work completed by BDs
// Based on lib/mysql-code-mappings.ts
const CLOSED_STATUS_CODES = [
  '13', // IPD Done
  '25', // Closed
  '30', // Call Done
  '31', // WA Done
  '32', // C/W Done
]

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
    const type = searchParams.get('type') // 'bd' or 'team'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    if (type === 'bd') {
      // Get closed leads stats based on status codes (IPD Done, Closed, Call Done, etc.)
      const closedWhere: Prisma.LeadWhereInput = {
        status: { in: CLOSED_STATUS_CODES },
        createdDate: dateFilter,
      }

      // Role-based filtering for closed leads
      if (user.role === 'BD') {
        closedWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        closedWhere.bd = {
          teamId: user.teamId,
        }
      }

      // Get all leads stats (for total leads calculation)
      const allLeadsWhere: Prisma.LeadWhereInput = {
        createdDate: dateFilter,
      }

      // Role-based filtering for all leads
      if (user.role === 'BD') {
        allLeadsWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        allLeadsWhere.bd = {
          teamId: user.teamId,
        }
      }

      // Get IPD Done count separately for highlighting
      const ipdDoneWhere: Prisma.LeadWhereInput = {
        status: '13', // IPD Done
        createdDate: dateFilter,
      }
      if (user.role === 'BD') {
        ipdDoneWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        ipdDoneWhere.bd = { teamId: user.teamId }
      }

      const [bdStats, bdLeads, ipdDoneStats] = await Promise.all([
        prisma.lead.groupBy({
          by: ['bdId'],
          where: closedWhere,
          _count: { id: true },
          _sum: {
            billAmount: true,
            netProfit: true,
          },
          _avg: {
            billAmount: true,
          },
        }),
        prisma.lead.groupBy({
          by: ['bdId'],
          where: allLeadsWhere,
          _count: { id: true },
        }),
        prisma.lead.groupBy({
          by: ['bdId'],
          where: ipdDoneWhere,
          _count: { id: true },
        }),
      ])

      const bdMap = new Map(bdLeads.map((b) => [b.bdId, b._count.id]))
      const ipdDoneMap = new Map(ipdDoneStats.map((b) => [b.bdId, b._count.id]))
      const bdIds = [...new Set([...bdStats.map((b) => b.bdId), ...bdLeads.map((b) => b.bdId)])].filter(
        (id): id is string => id !== null
      )
      const bds = await prisma.user.findMany({
        where: { id: { in: bdIds }, role: 'BD' },
        include: { team: { select: { id: true, name: true } } },
      })

      const leaderboard = bdStats.map((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        const totalLeads = bdMap.get(stat.bdId) || 0
        const closedLeads = stat._count.id
        const ipdDone = ipdDoneMap.get(stat.bdId) || 0
        const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0
        const avgTicketSize = stat._avg.billAmount || 0

        return {
          bdId: stat.bdId,
          bdName: bd?.name || 'Unknown',
          teamName: bd?.team?.name || 'No Team',
          totalLeads,
          closedLeads,
          ipdDone,
          conversionRate: Math.round(conversionRate * 100) / 100,
          netProfit: stat._sum.netProfit || 0,
          avgTicketSize: Math.round(avgTicketSize * 100) / 100,
        }
      })

      // Sort by closedLeads (cases closed) instead of netProfit
      leaderboard.sort((a, b) => b.closedLeads - a.closedLeads)

      return successResponse(leaderboard)
    } else if (type === 'team') {
      // Get closed leads stats based on status codes
      const closedWhere: Prisma.LeadWhereInput = {
        status: { in: CLOSED_STATUS_CODES },
        createdDate: dateFilter,
      }

      // Role-based filtering for closed leads
      if (user.role === 'BD') {
        closedWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        closedWhere.bd = {
          teamId: user.teamId,
        }
      }

      // Get all leads stats (for total leads calculation)
      const allLeadsWhere: Prisma.LeadWhereInput = {
        createdDate: dateFilter,
      }

      // Role-based filtering for all leads
      if (user.role === 'BD') {
        allLeadsWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        allLeadsWhere.bd = {
          teamId: user.teamId,
        }
      }

      // Get IPD Done count separately
      const ipdDoneWhere: Prisma.LeadWhereInput = {
        status: '13', // IPD Done
        createdDate: dateFilter,
      }
      if (user.role === 'BD') {
        ipdDoneWhere.bdId = user.id
      } else if (user.role === 'TEAM_LEAD' && user.teamId) {
        ipdDoneWhere.bd = { teamId: user.teamId }
      }

      const [teamStats, teamLeads, ipdDoneStats] = await Promise.all([
        prisma.lead.groupBy({
          by: ['bdId'],
          where: closedWhere,
          _count: { id: true },
          _sum: {
            billAmount: true,
            netProfit: true,
          },
        }),
        prisma.lead.groupBy({
          by: ['bdId'],
          where: allLeadsWhere,
          _count: { id: true },
        }),
        prisma.lead.groupBy({
          by: ['bdId'],
          where: ipdDoneWhere,
          _count: { id: true },
        }),
      ])

      const bds = await prisma.user.findMany({
        where: {
          id: {
            in: [...new Set([...teamStats.map((s) => s.bdId), ...teamLeads.map((s) => s.bdId)])].filter(
              (id): id is string => id !== null
            ),
          },
          role: 'BD',
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      const teamMap = new Map<
        string,
        { name: string; closedLeads: number; ipdDone: number; netProfit: number; revenue: number; totalLeads: number }
      >()

      // Process closed leads
      teamStats.forEach((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        if (bd?.team) {
          const existing = teamMap.get(bd.team.id) || {
            name: bd.team.name,
            closedLeads: 0,
            ipdDone: 0,
            netProfit: 0,
            revenue: 0,
            totalLeads: 0,
          }
          existing.closedLeads += stat._count.id
          existing.netProfit += stat._sum.netProfit || 0
          existing.revenue += stat._sum.billAmount || 0
          teamMap.set(bd.team.id, existing)
        }
      })

      // Process IPD Done counts
      ipdDoneStats.forEach((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        if (bd?.team) {
          const existing = teamMap.get(bd.team.id) || {
            name: bd.team.name,
            closedLeads: 0,
            ipdDone: 0,
            netProfit: 0,
            revenue: 0,
            totalLeads: 0,
          }
          existing.ipdDone += stat._count.id
          teamMap.set(bd.team.id, existing)
        }
      })

      // Process all leads for total count
      teamLeads.forEach((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        if (bd?.team) {
          const existing = teamMap.get(bd.team.id) || {
            name: bd.team.name,
            closedLeads: 0,
            ipdDone: 0,
            netProfit: 0,
            revenue: 0,
            totalLeads: 0,
          }
          existing.totalLeads += stat._count.id
          teamMap.set(bd.team.id, existing)
        }
      })

      const leaderboard = Array.from(teamMap.entries()).map(([teamId, data]) => {
        const conversionRate = data.totalLeads > 0 ? (data.closedLeads / data.totalLeads) * 100 : 0
        return {
          teamId,
          teamName: data.name,
          totalLeads: data.totalLeads,
          closedLeads: data.closedLeads,
          ipdDone: data.ipdDone,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenue: data.revenue,
          netProfit: data.netProfit,
        }
      })

      // Sort by closedLeads (cases closed) instead of netProfit
      leaderboard.sort((a, b) => b.closedLeads - a.closedLeads)

      return successResponse(leaderboard)
    }

    return errorResponse('Invalid type parameter', 400)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return errorResponse('Failed to fetch leaderboard', 500)
  }
}

