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
    if (!user) return unauthorizedResponse()

    const { id: noticeId } = await params

    const recipient = await prisma.noticeRecipient.findFirst({
      where: { noticeId, userId: user.id },
    })

    if (!recipient) {
      return errorResponse('Notice not found or unauthorized', 404)
    }

    await prisma.noticeRecipient.update({
      where: { id: recipient.id },
      data: { acknowledgedAt: new Date() },
    })

    return successResponse({ ok: true })
  } catch (error) {
    console.error('Error acknowledging notice:', error)
    return errorResponse('Failed to acknowledge notice', 500)
  }
}
