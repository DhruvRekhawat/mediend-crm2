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

    // Only MD and ADMIN can view anonymous messages
    if (user.role !== 'MD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const messages = await prisma.anonymousMessage.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(messages)
  } catch (error) {
    console.error('Error fetching anonymous messages:', error)
    return errorResponse('Failed to fetch messages', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'MD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')

    if (!messageId) {
      return errorResponse('Message ID required', 400)
    }

    const message = await prisma.anonymousMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    })

    return successResponse(message, 'Message marked as read')
  } catch (error) {
    console.error('Error updating message:', error)
    return errorResponse('Failed to update message', 500)
  }
}

