import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

/**
 * Get today's lead assignments grouped by BD
 * Returns count of new leads assigned to each BD today (IST)
 */
export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:read')) {
      return errorResponse('Forbidden', 403)
    }

    // Get current time in IST (UTC+5:30)
    const now = new Date()
    const istOffsetMs = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const istNow = new Date(now.getTime() + istOffsetMs)
    
    // Get IST date components
    const istYear = istNow.getUTCFullYear()
    const istMonth = istNow.getUTCMonth() // 0-11
    const istDay = istNow.getUTCDate()
    
    // Get today's date range in IST (start of day to end of day)
    const todayStart = new Date(Date.UTC(istYear, istMonth, istDay, 0, 0, 0, 0))
    const todayEnd = new Date(Date.UTC(istYear, istMonth, istDay, 23, 59, 59, 999))

    // Convert back to UTC for database query (Prisma uses UTC)
    const todayStartUTC = new Date(todayStart.getTime() - istOffsetMs)
    const todayEndUTC = new Date(todayEnd.getTime() - istOffsetMs)

    // Get all leads created today, grouped by BD
    const leads = await prisma.lead.findMany({
      where: {
        createdDate: {
          gte: todayStartUTC,
          lte: todayEndUTC,
        },
      },
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
                circle: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdDate: 'desc',
      },
    })

    // Group by BD and count
    const bdMap = new Map<
      string,
      {
        bdId: string
        bdName: string
        bdEmail: string
        teamName: string | null
        teamCircle: string | null
        leadCount: number
        leads: Array<{
          id: string
          leadRef: string
          patientName: string
          createdDate: Date
        }>
      }
    >()

    leads.forEach((lead) => {
      const bdId = lead.bdId
      if (!bdMap.has(bdId)) {
        bdMap.set(bdId, {
          bdId: lead.bd.id,
          bdName: lead.bd.name,
          bdEmail: lead.bd.email,
          teamName: lead.bd.team?.name || null,
          teamCircle: lead.bd.team?.circle || null,
          leadCount: 0,
          leads: [],
        })
      }

      const bdData = bdMap.get(bdId)!
      bdData.leadCount++
      bdData.leads.push({
        id: lead.id,
        leadRef: lead.leadRef,
        patientName: lead.patientName,
        createdDate: lead.createdDate,
      })
    })

    // Convert map to array and sort by lead count (descending)
    const assignments = Array.from(bdMap.values()).sort((a, b) => b.leadCount - a.leadCount)

    return successResponse({
      date: todayStart.toISOString().split('T')[0],
      totalLeads: leads.length,
      assignments,
    })
  } catch (error) {
    console.error('Error fetching today\'s lead assignments:', error)
    return errorResponse('Failed to fetch today\'s lead assignments', 500)
  }
}
