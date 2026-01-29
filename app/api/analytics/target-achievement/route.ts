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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return errorResponse('startDate and endDate are required', 400)
    }

    const periodStart = new Date(startDate)
    const periodEnd = new Date(endDate)

    // Get all targets for the period
    const targets = await prisma.target.findMany({
      where: {
        periodStartDate: { lte: periodEnd },
        periodEndDate: { gte: periodStart },
      },
      include: {
        bonusRules: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Get BD users for target lookup
    const bdUsers = await prisma.user.findMany({
      where: {
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

    // Calculate achievements for each target
    const targetAchievements = await Promise.all(
      targets.map(async (target) => {
        const dateFilter: Prisma.DateTimeFilter = {
          gte: new Date(Math.max(periodStart.getTime(), target.periodStartDate.getTime())),
          lte: new Date(Math.min(periodEnd.getTime(), target.periodEndDate.getTime())),
        }

        const where: Prisma.LeadWhereInput = {
          pipelineStage: 'COMPLETED',
          conversionDate: dateFilter,
        }

        // Apply target-specific filtering
        if (target.targetType === 'BD') {
          where.bdId = target.targetForId
        } else if (target.targetType === 'TEAM' && target.teamId) {
          where.bd = {
            teamId: target.teamId,
          }
        }

        // Role-based filtering
        if (user.role === 'BD') {
          where.bdId = user.id
        } else if (user.role === 'TEAM_LEAD' && user.teamId) {
          where.bd = {
            teamId: user.teamId,
          }
        }

        let achieved = 0

        switch (target.metric) {
          case 'LEADS_CLOSED':
            achieved = await prisma.lead.count({ where })
            break
          case 'NET_PROFIT':
            const profitAgg = await prisma.lead.aggregate({
              where,
              _sum: { netProfit: true },
            })
            achieved = profitAgg._sum.netProfit || 0
            break
          case 'BILL_AMOUNT':
            const billAgg = await prisma.lead.aggregate({
              where,
              _sum: { billAmount: true },
            })
            achieved = billAgg._sum.billAmount || 0
            break
          case 'SURGERIES_DONE':
            achieved = await prisma.lead.count({ where })
            break
        }

        const percentage = target.targetValue > 0 ? (achieved / target.targetValue) * 100 : 0

        // Get target entity name
        let entityName = 'Unknown'
        if (target.targetType === 'BD') {
          const bd = bdUsers.find((u) => u.id === target.targetForId)
          entityName = bd?.name || 'Unknown BD'
        } else if (target.targetType === 'TEAM') {
          entityName = target.team?.name || 'Unknown Team'
        }

        return {
          targetId: target.id,
          targetType: target.targetType,
          entityName,
          metric: target.metric,
          periodType: target.periodType,
          periodStartDate: target.periodStartDate.toISOString(),
          periodEndDate: target.periodEndDate.toISOString(),
          targetValue: target.targetValue,
          achieved,
          percentage: Math.round(percentage * 100) / 100,
          bonusRules: target.bonusRules.map((rule) => ({
            id: rule.id,
            type: rule.ruleType,
            threshold: rule.thresholdValue,
            bonusAmount: rule.bonusAmount,
            bonusPercentage: rule.bonusPercentage,
            capAmount: rule.capAmount,
          })),
        }
      })
    )

    // Group by entity and metric for summary
    const overallSummary = {
      leadsClosed: { target: 0, achieved: 0, percentage: 0 },
      netProfit: { target: 0, achieved: 0, percentage: 0 },
      billAmount: { target: 0, achieved: 0, percentage: 0 },
      surgeriesDone: { target: 0, achieved: 0, percentage: 0 },
    }

    targetAchievements.forEach((achievement) => {
      const metricKey = achievement.metric.toLowerCase() as keyof typeof overallSummary
      if (overallSummary[metricKey]) {
        overallSummary[metricKey].target += achievement.targetValue
        overallSummary[metricKey].achieved += achievement.achieved
      }
    })

    Object.keys(overallSummary).forEach((key) => {
      const metric = overallSummary[key as keyof typeof overallSummary]
      metric.percentage = metric.target > 0 ? (metric.achieved / metric.target) * 100 : 0
      metric.percentage = Math.round(metric.percentage * 100) / 100
    })

    return successResponse({
      overallSummary,
      targetAchievements,
    })
  } catch (error) {
    console.error('Error fetching target achievement:', error)
    return errorResponse('Failed to fetch target achievement', 500)
  }
}
