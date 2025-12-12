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

    const payrollRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId: employee.id,
      },
      include: {
        components: true,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    })

    return successResponse(payrollRecords)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return errorResponse('Failed to fetch payroll records', 500)
  }
}

