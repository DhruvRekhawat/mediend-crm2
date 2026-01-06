import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Normalize email to lowercase
    const normalizedEmail = data.email ? data.email.toLowerCase().trim() : undefined

    // Check if email is being updated and is unique
    if (normalizedEmail) {
      const existing = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: id },
        },
      })

      if (existing) {
        return errorResponse('Email already exists', 400)
      }
    }

    const updateData: Prisma.UserUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            circle: true,
          },
        },
        employee: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const { passwordHash: _passwordHash, ...safeUser } = updated

    return successResponse(safeUser, 'User updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse('Email already exists', 400)
    }
    console.error('Error updating user:', error)
    return errorResponse('Failed to update user', 500)
  }
}

