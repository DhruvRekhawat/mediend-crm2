import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { initializeLeaveBalances } from '@/lib/hrms/leave-balance-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    })

    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    // Initialize leave balances
    await initializeLeaveBalances(employee.id)

    return successResponse(null, 'Leave balances initialized successfully')
  } catch (error) {
    console.error('Error initializing leave balances:', error)
    return errorResponse('Failed to initialize leave balances', 500)
  }
}

