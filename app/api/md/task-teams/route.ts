import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  employeeIds: z.array(z.string()).default([]),
})

function requireMDOrAdmin(user: { role: string }) {
  if (user.role !== 'MD' && user.role !== 'ADMIN') {
    return false
  }
  return true
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!requireMDOrAdmin(user)) {
      return errorResponse('Forbidden', 403)
    }

    const teams = await prisma.mDTaskTeam.findMany({
      where: { ownerId: user.id },
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
      orderBy: { name: 'asc' },
    })

    return successResponse(teams)
  } catch (error) {
    console.error('Error fetching MD task teams:', error)
    return errorResponse('Failed to fetch teams', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!requireMDOrAdmin(user)) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { name, employeeIds } = createTeamSchema.parse(body)

    const team = await prisma.mDTaskTeam.create({
      data: {
        name,
        ownerId: user.id,
        members: {
          create: employeeIds.map((employeeId: string) => ({ employeeId })),
        },
      },
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

    return successResponse(team, 'Team created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors.map((e) => e.message).join(', '), 400)
    }
    console.error('Error creating MD task team:', error)
    return errorResponse('Failed to create team', 500)
  }
}
