import { NextRequest } from 'next/server'
import { destroySession } from '@/lib/session'
import { successResponse } from '@/lib/api-utils'

export async function POST() {
  await destroySession()
  return successResponse({}, 'Logged out successfully')
}

