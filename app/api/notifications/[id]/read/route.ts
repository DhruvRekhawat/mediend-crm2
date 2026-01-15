import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return errorResponse('Notification not found', 404)
    }

    if (notification.userId !== user.id) {
      return errorResponse('Forbidden', 403)
    }

    // Mark as read
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return successResponse(updated, 'Notification marked as read')
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return errorResponse('Failed to mark notification as read', 500)
  }
}
