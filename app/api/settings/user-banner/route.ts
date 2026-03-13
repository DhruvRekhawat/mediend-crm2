import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

const KEY_PREFIX = 'user_banner:'

function getUserBannerKey(userId: string) {
  return `${KEY_PREFIX}${userId}`
}

/**
 * GET /api/settings/user-banner
 * Returns the current user's banner URL. Any authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const key = getUserBannerKey(user.id)
    const row = await prisma.appSetting.findUnique({
      where: { key },
    })

    return successResponse({ bannerUrl: row?.value ?? null })
  } catch (err) {
    console.error('[GET /api/settings/user-banner]', err)
    return errorResponse('Failed to fetch banner', 500)
  }
}

/**
 * PATCH /api/settings/user-banner
 * Body: { value: string }
 * Updates the current user's banner URL. Any authenticated user can update their own.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { value } = body as { value?: string }

    if (typeof value !== 'string') {
      return errorResponse('Missing value', 400)
    }

    const key = getUserBannerKey(user.id)
    await prisma.appSetting.upsert({
      where: { key },
      update: { value, updatedBy: user.id },
      create: { key, value, updatedBy: user.id },
    })

    return successResponse({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/user-banner]', err)
    return errorResponse('Failed to update banner', 500)
  }
}
