import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Mark all unread notifications as read for the user
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return successResponse({ count: result.count }, 'All notifications marked as read')
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return errorResponse('Failed to mark all notifications as read', 500)
  }
}
