import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getSubordinates } from '@/lib/hierarchy'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const manager = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!manager) {
      return errorResponse('Employee record not found', 404)
    }

    const subordinates = await getSubordinates(manager.id, false)
    const subordinateIds = subordinates.map((s) => s.id)

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const month = searchParams.get('month')

    let rangeStart: Date
    let rangeEnd: Date
    if (fromDate && toDate) {
      const [sy, sm, sd] = fromDate.split('-').map(Number)
      const [ey, em, ed] = toDate.split('-').map(Number)
      rangeStart = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0))
      rangeEnd = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999))
    } else if (month) {
      const [y, m] = month.split('-').map(Number)
      rangeStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
      rangeEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
    } else {
      const now = new Date()
      rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
      rangeEnd = new Date()
    }

    const list = await prisma.attendanceNormalization.findMany({
      where: {
        employeeId: { in: subordinateIds },
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { name: true, email: true } },
          },
        },
        requestedBy: { select: { id: true, user: { select: { name: true } } } },
        approvedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    })

    const usedPerEmployee: Record<string, number> = {}
    for (const n of list) {
      if (n.type === 'MANAGER' && n.status === 'APPROVED') {
        const key = n.employeeId
        const monthKey = `${n.date.getUTCFullYear()}-${n.date.getUTCMonth()}`
        const k = `${key}-${monthKey}`
        usedPerEmployee[k] = (usedPerEmployee[k] || 0) + 1
      }
    }

    return successResponse({
      list,
      subordinates: subordinates.map((s) => ({
        id: s.id,
        employeeCode: s.employeeCode,
        name: s.user.name,
        email: s.user.email,
      })),
    })
  } catch (error) {
    console.error('Error fetching team normalizations:', error)
    return errorResponse('Failed to fetch team normalizations', 500)
  }
}
