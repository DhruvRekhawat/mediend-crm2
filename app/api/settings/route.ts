import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

/**
 * GET /api/settings?keys=thought_of_the_day,banner_image_url
 * Returns a key→value map for the requested keys.
 * Open to all authenticated users.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const keysParam = request.nextUrl.searchParams.get('keys')
    const keys = keysParam ? keysParam.split(',').map((k) => k.trim()).filter(Boolean) : []

    const rows = await prisma.appSetting.findMany(
      keys.length ? { where: { key: { in: keys } } } : undefined
    )

    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }

    return successResponse(result)
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return errorResponse('Failed to fetch settings', 500)
  }
}

/**
 * PATCH /api/settings
 * Body: { key: string; value: string }
 * MD / ADMIN only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    if (user.role !== 'MD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { key, value } = body as { key?: string; value?: string }

    if (!key || typeof key !== 'string') {
      return errorResponse('Missing key', 400)
    }
    if (typeof value !== 'string') {
      return errorResponse('Missing value', 400)
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      update: { value, updatedBy: user.id },
      create: { key, value, updatedBy: user.id },
    })

    return successResponse(setting)
  } catch (err) {
    console.error('[PATCH /api/settings]', err)
    return errorResponse('Failed to update setting', 500)
  }
}
