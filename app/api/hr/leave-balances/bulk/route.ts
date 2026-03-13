import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, unauthorizedResponse } from '@/lib/api-utils'

/** Balances are now computed from policy; bulk upload is deprecated. */
export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }
  if (!hasPermission(user, 'hrms:employees:write') && !hasPermission(user, 'hrms:leaves:write')) {
    return errorResponse('Forbidden', 403)
  }
  return errorResponse(
    'Bulk upload is no longer available. Leave balances are now computed automatically from the monthly policy (1 CL, 0.5 SL, 0.5 EL per month; EL carries forward year to year).',
    410
  )
}
