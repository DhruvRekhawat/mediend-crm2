import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

/**
 * One-time reset: clear all stored LeaveBalance records.
 * Balances are now computed from policy; this removes legacy annual-style data.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const result = await prisma.leaveBalance.deleteMany({})

    return successResponse(
      { deleted: result.count },
      `Cleared ${result.count} legacy leave balance record(s). Balances are now computed from policy.`
    )
  } catch (error) {
    console.error('Error resetting leave balances:', error)
    return errorResponse('Failed to reset leave balances', 500)
  }
}
