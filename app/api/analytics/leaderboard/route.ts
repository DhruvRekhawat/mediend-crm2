import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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
    const type = searchParams.get('type') // 'bd' or 'team'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    if (type === 'bd') {
      const bdStats = await prisma.lead.groupBy({
        by: ['bdId'],
        where: {
          pipelineStage: 'COMPLETED',
          conversionDate: dateFilter,
        },
        _count: {
          id: true,
        },
        _sum: {
          netProfit: true,
        },
      })

      const bds = await prisma.user.findMany({
        where: {
          id: {
            in: bdStats.map((s) => s.bdId).filter((id): id is string => id !== null),
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

      const leaderboard = bdStats.map((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        return {
          bdId: stat.bdId,
          bdName: bd?.name || 'Unknown',
          teamName: bd?.team?.name || 'No Team',
          closedLeads: stat._count.id,
          netProfit: stat._sum.netProfit || 0,
        }
      })

      leaderboard.sort((a, b) => b.netProfit - a.netProfit)

      return successResponse(leaderboard)
    } else if (type === 'team') {
      const teamStats = await prisma.lead.groupBy({
        by: ['bdId'],
        where: {
          pipelineStage: 'COMPLETED',
          conversionDate: dateFilter,
        },
        _count: {
          id: true,
        },
        _sum: {
          netProfit: true,
        },
      })

      const bds = await prisma.user.findMany({
        where: {
          id: {
            in: teamStats.map((s) => s.bdId).filter((id): id is string => id !== null),
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

      const teamMap = new Map<string, { name: string; closedLeads: number; netProfit: number }>()

      teamStats.forEach((stat) => {
        const bd = bds.find((b) => b.id === stat.bdId)
        if (bd?.team) {
          const existing = teamMap.get(bd.team.id) || { name: bd.team.name, closedLeads: 0, netProfit: 0 }
          existing.closedLeads += stat._count.id
          existing.netProfit += stat._sum.netProfit || 0
          teamMap.set(bd.team.id, existing)
        }
      })

      const leaderboard = Array.from(teamMap.entries()).map(([teamId, data]) => ({
        teamId,
        teamName: data.name,
        closedLeads: data.closedLeads,
        netProfit: data.netProfit,
      }))

      leaderboard.sort((a, b) => b.netProfit - a.netProfit)

      return successResponse(leaderboard)
    }

    return errorResponse('Invalid type parameter', 400)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return errorResponse('Failed to fetch leaderboard', 500)
  }
}

