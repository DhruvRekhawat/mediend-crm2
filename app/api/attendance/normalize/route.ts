import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const SELF_NORMALIZATION_LIMIT_PER_MONTH = 3

const bodySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { date } = bodySchema.parse(body)

    const dateKey = date.toISOString().split('T')[0]
    const [y, m, d] = dateKey.split('-').map(Number)
    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))

    const countThisMonth = await prisma.attendanceNormalization.count({
      where: {
        employeeId: employee.id,
        type: 'SELF',
        status: 'APPROVED',
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    if (countThisMonth >= SELF_NORMALIZATION_LIMIT_PER_MONTH) {
      return errorResponse(
        `Self-normalization limit reached (${SELF_NORMALIZATION_LIMIT_PER_MONTH} per month)`,
        400
      )
    }

    const existing = await prisma.attendanceNormalization.findUnique({
      where: {
        employeeId_date: { employeeId: employee.id, date: dayStart },
      },
    })

    if (existing) {
      return errorResponse('This day is already normalized', 400)
    }

    const normalization = await prisma.attendanceNormalization.create({
      data: {
        employeeId: employee.id,
        date: dayStart,
        type: 'SELF',
        requestedById: employee.id,
        status: 'APPROVED',
      },
      include: {
        employee: { select: { id: true, employeeCode: true } },
      },
    })

    return successResponse(normalization, 'Attendance normalized successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating self-normalization:', error)
    return errorResponse('Failed to normalize attendance', 500)
  }
}
