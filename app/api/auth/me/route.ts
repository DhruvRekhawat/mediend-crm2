import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/auth'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return unauthorizedResponse()
  }

  const user = await getUserById(session.id)
  if (!user) {
    return unauthorizedResponse()
  }

  return successResponse(user)
}

