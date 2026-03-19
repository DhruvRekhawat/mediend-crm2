import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { UserRole } from '@/generated/prisma/client'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api-utils'

/**
 * One-time cleanup: Delete LeaveBalance rows for all currently-probation employees.
 * Run once to remove stale seeded values (SL=12, EL=18) so they don't surface when
 * employees graduate from probation. After deletion, the DOJ formula computes cleanly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return unauthorizedResponse('Unauthorized')
    }

    const result = await prisma.$executeRaw`
      DELETE FROM "LeaveBalance"
      WHERE "employeeId" IN (
        SELECT id FROM "Employee"
        WHERE "joinDate" IS NOT NULL
          AND "joinDate"::date > ((CURRENT_DATE - INTERVAL '6 months')::date)
      )
    `

    return successResponse({
      deletedCount: result,
      message: `Deleted ${result} LeaveBalance row(s) for probation employees`,
    })
  } catch (error) {
    console.error('Error fixing probation balances:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fix probation balances',
      500
    )
  }
}
