import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(_request)
    if (!user) return unauthorizedResponse()

    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    await prisma.holiday.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return errorResponse('Failed to delete holiday', 500)
  }
}
