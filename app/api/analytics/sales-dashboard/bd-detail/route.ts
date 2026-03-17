import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/generated/prisma/client'
import { getSession } from '@/lib/session'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return unauthorizedResponse()
    if (user.role !== UserRole.MD && user.role !== UserRole.SALES_HEAD) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const bdId = searchParams.get('bdId')
    if (!bdId) return errorResponse('bdId is required', 400)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date(new Date().getFullYear(), 0, 1)
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date()

    const [bdUser, allLeads, completedLeads] = await Promise.all([
      prisma.user.findUnique({
        where: { id: bdId },
        select: {
          id: true,
          name: true,
          profilePicture: true,
          team: { select: { id: true, name: true, circle: true } },
        },
      }),
      prisma.lead.findMany({
        where: {
          bdId,
          OR: [
            { leadDate: { gte: start, lte: end } },
            { AND: [{ leadDate: null }, { createdDate: { gte: start, lte: end } }] },
          ],
        },
        select: {
          id: true,
          leadDate: true,
          createdDate: true,
          pipelineStage: true,
          netProfit: true,
          billAmount: true,
        },
      }),
      prisma.lead.findMany({
        where: {
          bdId,
          pipelineStage: 'COMPLETED',
          OR: [
            { conversionDate: { gte: start, lte: end } },
            { AND: [{ conversionDate: null }, { surgeryDate: { gte: start, lte: end } }] },
            { AND: [{ conversionDate: null }, { surgeryDate: null }, { leadDate: { gte: start, lte: end } }] },
          ],
        },
        select: {
          id: true,
          patientName: true,
          treatment: true,
          hospitalName: true,
          surgeonName: true,
          conversionDate: true,
          surgeryDate: true,
          leadDate: true,
          createdDate: true,
          billAmount: true,
          netProfit: true,
          circle: true,
          status: true,
        },
        orderBy: { conversionDate: 'desc' },
        take: 200,
      }),
    ])

    if (!bdUser) return errorResponse('BD not found', 404)

    const totalLeads = allLeads.length
    const ipdDone = allLeads.filter((l) => l.pipelineStage === 'COMPLETED').length
    const conversionRate = totalLeads > 0 ? (ipdDone / totalLeads) * 100 : 0
    const netProfit = allLeads.reduce((s, l) => s + (l.netProfit ?? 0), 0)
    const billAmount = allLeads.reduce((s, l) => s + (l.billAmount ?? 0), 0)
    const avgTicketSize = ipdDone > 0 ? billAmount / ipdDone : 0

    // Month-wise breakdown (all leads for this BD, all time, no date filter)
    const allLeadsAllTime = await prisma.$queryRaw<
      { month: string; leadCount: number; ipdCount: number }[]
    >`
      SELECT
        TO_CHAR(COALESCE(l."leadDate", l."createdDate"), 'YYYY-MM') AS month,
        COUNT(*)::int AS "leadCount",
        COUNT(*) FILTER (WHERE l."pipelineStage" = 'COMPLETED')::int AS "ipdCount"
      FROM "Lead" l
      WHERE l."bdId" = ${bdId}
      GROUP BY TO_CHAR(COALESCE(l."leadDate", l."createdDate"), 'YYYY-MM')
      ORDER BY month
    `

    // Treatment breakdown for pie chart
    const treatmentBreakdown: Record<string, number> = {}
    completedLeads.forEach((l) => {
      const t = l.treatment ?? 'Unknown'
      treatmentBreakdown[t] = (treatmentBreakdown[t] ?? 0) + 1
    })

    const surgeries = completedLeads.map((l) => ({
      id: l.id,
      patientName: l.patientName,
      treatment: l.treatment ?? 'Unknown',
      hospitalName: l.hospitalName,
      surgeonName: l.surgeonName ?? null,
      date: (l.conversionDate ?? l.surgeryDate ?? l.leadDate ?? l.createdDate).toISOString(),
      billAmount: l.billAmount ?? 0,
      netProfit: l.netProfit ?? 0,
      circle: l.circle,
    }))

    return successResponse({
      bd: {
        id: bdUser.id,
        name: bdUser.name,
        profilePicture: bdUser.profilePicture ?? null,
        team: bdUser.team,
      },
      kpis: {
        totalLeads,
        ipdDone,
        conversionRate,
        netProfit,
        billAmount,
        avgTicketSize,
      },
      surgeries,
      monthWise: allLeadsAllTime.map((r) => ({
        month: r.month,
        leadCount: Number(r.leadCount),
        ipdCount: Number(r.ipdCount),
      })),
      treatmentBreakdown: Object.entries(treatmentBreakdown)
        .map(([treatment, count]) => ({ treatment, count }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('BD detail error:', error)
    return errorResponse('Failed to fetch BD detail', 500)
  }
}
