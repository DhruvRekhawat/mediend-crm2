import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  employeeIds: z.array(z.string()).optional(),
})

function requireMDOrAdmin(user: { role: string }) {
  return user.role === 'MD' || user.role === 'ADMIN'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!requireMDOrAdmin(user)) return errorResponse('Forbidden', 403)

    const { id } = await params

    const team = await prisma.mDTaskTeam.findFirst({
      where: { id, ownerId: user.id },
      include: {
        members: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!team) return errorResponse('Team not found', 404)
    return successResponse(team)
  } catch (error) {
    console.error('Error fetching MD task team:', error)
    return errorResponse('Failed to fetch team', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!requireMDOrAdmin(user)) return errorResponse('Forbidden', 403)

    const { id } = await params
    const existing = await prisma.mDTaskTeam.findFirst({
      where: { id, ownerId: user.id },
    })
    if (!existing) return errorResponse('Team not found', 404)

    const body = await request.json()
    const parsed = updateTeamSchema.parse(body)

    if (parsed.employeeIds !== undefined) {
      await prisma.mDTaskTeamMember.deleteMany({ where: { teamId: id } })
      if (parsed.employeeIds.length > 0) {
        await prisma.mDTaskTeamMember.createMany({
          data: parsed.employeeIds.map((employeeId) => ({ teamId: id, employeeId })),
        })
      }
    }

    const team = await prisma.mDTaskTeam.update({
      where: { id },
      data: parsed.name != null ? { name: parsed.name } : {},
      include: {
        members: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return successResponse(team, 'Team updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors.map((e) => e.message).join(', '), 400)
    }
    console.error('Error updating MD task team:', error)
    return errorResponse('Failed to update team', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!requireMDOrAdmin(user)) return errorResponse('Forbidden', 403)

    const { id } = await params
    const existing = await prisma.mDTaskTeam.findFirst({
      where: { id, ownerId: user.id },
    })
    if (!existing) return errorResponse('Team not found', 404)

    await prisma.mDTaskTeam.delete({ where: { id } })
    return successResponse({ deleted: true }, 'Team deleted successfully')
  } catch (error) {
    console.error('Error deleting MD task team:', error)
    return errorResponse('Failed to delete team', 500)
  }
}
