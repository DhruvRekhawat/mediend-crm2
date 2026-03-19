import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(_request: NextRequest) {
  try {
    const user = getSessionFromRequest(_request)
    if (!user) return unauthorizedResponse()

    const today = new Date()
    const month = today.getMonth()
    const day = today.getDate()

    const employees = await prisma.employee.findMany({
      where: {
        dateOfBirth: { not: null },
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const birthdaysToday = employees.filter((emp) => {
      const dob = new Date(emp.dateOfBirth!)
      return dob.getMonth() === month && dob.getDate() === day
    })

    const result = birthdaysToday.map((emp) => ({
      id: emp.id,
      userId: emp.userId,
      name: emp.user.name,
      dateOfBirth: emp.dateOfBirth!.toISOString(),
    }))

    return successResponse(result)
  } catch (error) {
    console.error('Error fetching birthdays:', error)
    return errorResponse('Failed to fetch birthdays', 500)
  }
}
