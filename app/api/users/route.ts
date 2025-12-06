import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { hashPassword } from '@/lib/auth'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN']),
  teamId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const teamId = searchParams.get('teamId')

    const where: any = {}
    if (role) where.role = role
    if (teamId) where.teamId = teamId

    const users = await prisma.user.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            circle: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Remove password hash from response
    const safeUsers = users.map(({ passwordHash: _passwordHash, ...user }) => user)

    return successResponse(safeUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return errorResponse('Failed to fetch users', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'users:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    const passwordHash = await hashPassword(data.password)

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        teamId: data.teamId || null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            circle: true,
          },
        },
      },
    })

    const { passwordHash: _passwordHash, ...safeUser } = newUser

    return successResponse(safeUser, 'User created successfully')
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    if (error.code === 'P2002') {
      return errorResponse('Email already exists', 400)
    }
    console.error('Error creating user:', error)
    return errorResponse('Failed to create user', 500)
  }
}

