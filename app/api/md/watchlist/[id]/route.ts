import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD/Admin can manage watchlist
    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    // Verify the watchlist entry belongs to this user before deleting
    const entry = await prisma.mDWatchlistEmployee.findUnique({
      where: { id },
    })

    if (!entry) {
      return errorResponse('Watchlist entry not found', 404)
    }

    if (entry.ownerId !== user.id) {
      return errorResponse('You can only remove from your own watchlist', 403)
    }

    await prisma.mDWatchlistEmployee.delete({
      where: { id },
    })

    return successResponse({ message: 'Employee removed from watchlist' })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return errorResponse('Failed to remove from watchlist', 500)
  }
}
