import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createHolidaySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  name: z.string().min(1),
  type: z.enum(['Compulsory', 'Optional']),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')

    const where: { date?: { gte: Date; lte: Date } } = {}
    if (yearParam) {
      const year = parseInt(yearParam, 10)
      if (!Number.isNaN(year)) {
        where.date = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59, 999),
        }
      }
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    const result = holidays.map((h) => ({
      id: h.id,
      date: h.date.toISOString().split('T')[0],
      name: h.name,
      type: h.type,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return errorResponse('Failed to fetch holidays', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = createHolidaySchema.parse(body)

    const existing = await prisma.holiday.findUnique({
      where: { date: data.date },
    })
    if (existing) {
      return errorResponse('A holiday already exists for this date', 400)
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: data.date,
        name: data.name,
        type: data.type,
      },
    })

    return successResponse({
      id: holiday.id,
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      type: holiday.type,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors.map((e) => e.message).join(', '), 400)
    }
    console.error('Error creating holiday:', error)
    return errorResponse('Failed to create holiday', 500)
  }
}
