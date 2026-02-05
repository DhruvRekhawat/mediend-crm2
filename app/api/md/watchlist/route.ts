import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD/Admin can access watchlist
    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    // Fetch watchlist employees for this user
    const watchlistEntries = await prisma.mDWatchlistEmployee.findMany({
      where: { ownerId: user.id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Map entries to include watchlist ID
    const employees = watchlistEntries.map((entry) => ({
      ...entry.employee,
      watchlistId: entry.id, // Include the watchlist entry ID for deletion
    }))

    // Get today's date range
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // Fetch today's attendance for all watchlist employees
    const employeeIds = employees.map((emp) => emp.id)
    const todayAttendance = await prisma.attendanceLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        logDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        logDate: 'asc',
      },
    })

    // Fetch approved leaves for today
    const todayLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    })

    // Build status map for each employee
    const statusMap: Record<string, { status: 'in' | 'not-in' | 'leave'; inTime: string | null }> = {}

    for (const employee of employees) {
      // Check if on leave
      const onLeave = todayLeaves.some((leave) => leave.employeeId === employee.id)
      if (onLeave) {
        statusMap[employee.id] = { status: 'leave', inTime: null }
        continue
      }

      // Check if checked in today (get first punch of the day)
      const attendance = todayAttendance.find((a) => a.employeeId === employee.id)
      if (attendance) {
        statusMap[employee.id] = {
          status: 'in',
          inTime: attendance.logDate.toISOString(),
        }
      } else {
        statusMap[employee.id] = { status: 'not-in', inTime: null }
      }
    }

    return successResponse({
      employees,
      status: statusMap,
    })
  } catch (error) {
    console.error('Error fetching MD watchlist:', error)
    return errorResponse('Failed to fetch watchlist', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD/Admin can manage watchlist
    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { employeeIds } = body

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse('employeeIds must be a non-empty array', 400)
    }

    // Add employees to watchlist (use createMany to skip duplicates)
    const data = employeeIds.map((employeeId) => ({
      ownerId: user.id,
      employeeId,
    }))

    await prisma.mDWatchlistEmployee.createMany({
      data,
      skipDuplicates: true,
    })

    return successResponse({ message: 'Employees added to watchlist' })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return errorResponse('Failed to add to watchlist', 500)
  }
}
