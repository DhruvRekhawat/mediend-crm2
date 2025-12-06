import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/auth'
import { successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET() {
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

