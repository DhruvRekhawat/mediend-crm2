import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = getSessionFromRequest(request)
    if (!sessionUser) {
      return unauthorizedResponse()
    }

    const { id } = await params

    // Users can only change their own password, or admins/HR can change any password
    if (sessionUser.id !== id && !hasPermission(sessionUser, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = changePasswordSchema.parse(body)

    // Get the user with password hash
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    // Verify current password
    const isValidPassword = await verifyPassword(data.currentPassword, user.passwordHash)
    if (!isValidPassword) {
      return errorResponse('Current password is incorrect', 400)
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.newPassword)

    // Update password
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return successResponse({ message: 'Password changed successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error changing password:', error)
    return errorResponse('Failed to change password', 500)
  }
}

