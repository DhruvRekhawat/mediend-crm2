import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

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
        employeeId: employee.id,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { date: 'desc' },
      include: {
        requestedBy: { select: { id: true, user: { select: { name: true } } } },
        approvedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    })

    const selfCount = list.filter((n) => n.type === 'SELF').length
    const managerCount = list.filter((n) => n.type === 'MANAGER').length

    return successResponse({
      list,
      selfCount,
      managerCount,
      selfLimit: 3,
    })
  } catch (error) {
    console.error('Error fetching normalization records:', error)
    return errorResponse('Failed to fetch normalization records', 500)
  }
}
