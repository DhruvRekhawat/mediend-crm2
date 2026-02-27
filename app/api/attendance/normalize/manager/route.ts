import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const MANAGER_NORMALIZATION_LIMIT_PER_EMPLOYEE_PER_MONTH = 5

const bodySchema = z.object({
  employeeId: z.string(),
  date: z.string().transform((s) => new Date(s)),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { employeeId, date, reason } = bodySchema.parse(body)

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    if (employee.managerId !== manager.id) {
      return errorResponse('You can only normalize attendance for your direct reports', 403)
    }

    const dateKey = date.toISOString().split('T')[0]
    const [y, m, d] = dateKey.split('-').map(Number)
    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))

    const countThisMonth = await prisma.attendanceNormalization.count({
      where: {
        employeeId: employee.id,
        type: 'MANAGER',
        status: 'APPROVED',
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    if (countThisMonth >= MANAGER_NORMALIZATION_LIMIT_PER_EMPLOYEE_PER_MONTH) {
      return errorResponse(
        `Manager normalization limit for this employee reached (${MANAGER_NORMALIZATION_LIMIT_PER_EMPLOYEE_PER_MONTH} per month)`,
        400
      )
    }

    const existing = await prisma.attendanceNormalization.findUnique({
      where: {
        employeeId_date: { employeeId: employee.id, date: dayStart },
      },
    })

    if (existing) {
      return errorResponse('This day is already normalized for the employee', 400)
    }

    const normalization = await prisma.attendanceNormalization.create({
      data: {
        employeeId: employee.id,
        date: dayStart,
        type: 'MANAGER',
        requestedById: manager.id,
        approvedById: manager.id,
        status: 'APPROVED',
        reason: reason ?? null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    })

    return successResponse(normalization, 'Attendance normalized successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating manager normalization:', error)
    return errorResponse('Failed to normalize attendance', 500)
  }
}
