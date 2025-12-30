import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { groupAttendanceByDate } from '@/lib/hrms/attendance-utils'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Get employee record for user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const where: Prisma.AttendanceLogWhereInput = {
      employeeId: employee.id,
    }

    if (fromDate || toDate) {
      where.logDate = {}
      if (fromDate) {
        const [y, m, d] = fromDate.split('-').map(Number)
        where.logDate.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
      }
      if (toDate) {
        const [y, m, d] = toDate.split('-').map(Number)
        where.logDate.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
      }
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: {
        logDate: 'desc',
      },
    })

    const grouped = groupAttendanceByDate(logs)

    return successResponse(grouped)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return errorResponse('Failed to fetch attendance', 500)
  }
}

