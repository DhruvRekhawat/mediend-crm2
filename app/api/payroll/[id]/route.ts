import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Handle params as Promise (Next.js 15) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const payrollId = resolvedParams.id

    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: payrollId },
      include: {
        components: true,
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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
    })

    if (!payrollRecord) {
      return errorResponse('Payroll record not found', 404)
    }

    // Check if user has permission to view payroll OR if it's their own payroll
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    const isOwnPayroll = employee?.id === payrollRecord.employeeId
    const canView = isOwnPayroll || hasPermission(user, 'hrms:payroll:read')

    if (!canView) {
      return errorResponse('Forbidden', 403)
    }

    return successResponse(payrollRecord)
  } catch (error) {
    console.error('Error fetching payroll record:', error)
    return errorResponse('Failed to fetch payroll record', 500)
  }
}

