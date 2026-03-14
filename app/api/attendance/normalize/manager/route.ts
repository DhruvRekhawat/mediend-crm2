import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const bodySchema = z.object({
  employeeId: z.string(),
  dates: z.array(z.string().transform((s) => new Date(s))).min(1),
  reason: z.string().optional(),
})

function toDayStart(d: Date): Date {
  const [y, m, day] = d.toISOString().split('T')[0].split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0))
}

/** Deadline for applying normalization for a given month: end of 5th of next month. */
function getNormalizationDeadline(monthDate: Date): Date {
  const y = monthDate.getUTCFullYear()
  const m = monthDate.getUTCMonth()
  return new Date(Date.UTC(y, m + 1, 5, 23, 59, 59, 999))
}

function isWithinApplicationWindow(date: Date, now: Date): boolean {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
  const deadline = getNormalizationDeadline(monthStart)
  return now <= deadline
}

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
    const { employeeId, dates, reason } = bodySchema.parse(body)

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { name: true } } },
    })

    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    if (employee.managerId !== manager.id) {
      return errorResponse('You can only normalize attendance for your direct reports', 403)
    }

    const dayStarts = [...new Set(dates.map(toDayStart).map((d) => d.getTime()))].map(
      (t) => new Date(t)
    )

    const now = new Date()
    const outOfWindow = dayStarts.filter((d) => !isWithinApplicationWindow(d, now))
    if (outOfWindow.length > 0) {
      const d = outOfWindow[0]
      const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
      const deadline = getNormalizationDeadline(monthStart)
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const deadlineStr = `${deadline.getUTCDate()}/${deadline.getUTCMonth() + 1}/${deadline.getUTCFullYear()}`
      return errorResponse(
        `Cannot apply for ${monthKey} after the 5th of the next month (deadline was ${deadlineStr}). Remove out-of-window dates and try again.`,
        400
      )
    }

    const existingNorm = await prisma.attendanceNormalization.findMany({
      where: {
        employeeId: employee.id,
        date: { in: dayStarts },
      },
      select: { date: true },
    })
    const existingSet = new Set(
      existingNorm.map((n) => n.date.toISOString().split('T')[0])
    )

    const toCreate = dayStarts.filter((d) => {
      const key = d.toISOString().split('T')[0]
      return !existingSet.has(key)
    })

    if (toCreate.length === 0) {
      return successResponse(
        { created: 0, skipped: dayStarts.length, message: 'All selected days already have an application or are normalized' },
        'No new applications created'
      )
    }

    await prisma.attendanceNormalization.createMany({
      data: toCreate.map((date) => ({
        employeeId: employee.id,
        date,
        type: 'MANAGER',
        requestedById: manager.id,
        approvedById: null,
        status: 'PENDING',
        reason: reason ?? null,
      })),
    })

    // Notify all HR_HEAD users
    const hrHeads = await prisma.user.findMany({
      where: { role: 'HR_HEAD' },
      select: { id: true },
    })
    const empName = employee.user?.name ?? 'An employee'
    if (hrHeads.length > 0) {
      await prisma.notification.createMany({
        data: hrHeads.map((h) => ({
          userId: h.id,
          type: 'NORMALIZATION_REQUESTED',
          title: 'Normalization Request',
          message: `${empName} has requested attendance normalization`,
          link: '/hr/normalizations',
          relatedId: employee.id,
        })),
      })
    }

    return successResponse(
      { created: toCreate.length, skipped: dayStarts.length - toCreate.length },
      `Applied for normalization of ${toCreate.length} day(s). Pending HR approval.`
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating manager normalization:', error)
    return errorResponse('Failed to normalize attendance', 500)
  }
}
