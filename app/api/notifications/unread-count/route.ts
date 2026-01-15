import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return successResponse({ count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return errorResponse('Failed to fetch unread count', 500)
  }
}
