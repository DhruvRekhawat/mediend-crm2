import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canCreateRole } from '@/lib/rbac'
import { hashPassword } from '@/lib/auth'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN', 'USER']),
  departmentId: z.string().optional().nullable(),
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

    const where: Prisma.UserWhereInput = {}
    // if (role) where.role = role 
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
        employee: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                headId: true,
              },
            },
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

    // Prevent MD role creation
    if (data.role === 'MD') {
      return errorResponse('MD role cannot be created', 400)
    }

    // Validate creator has permission to create this role
    if (!canCreateRole(user, data.role)) {
      return errorResponse(`You do not have permission to create users with role: ${data.role}`, 403)
    }

    // Normalize email to lowercase
    const normalizedEmail = data.email.toLowerCase().trim()

    const passwordHash = await hashPassword(data.password)

    // Auto-assign team for BD and TEAM_LEAD roles
    let teamId: string | null = null
    if (data.role === 'BD' || data.role === 'TEAM_LEAD') {
      // Find first available team
      const firstTeam = await prisma.team.findFirst({
        orderBy: {
          createdAt: 'asc',
        },
      })
      if (firstTeam) {
        teamId = firstTeam.id
      }
    }

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: data.name,
        role: data.role,
        teamId,
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

    // Create employee record if departmentId is provided
    if (data.departmentId) {
      try {
        // Generate unique employee code
        let employeeCode: string
        let isUnique = false
        let attempt = 0
        
        while (!isUnique && attempt < 100) {
          const employeeCount = await prisma.employee.count()
          employeeCode = `EMP${String(employeeCount + attempt + 1).padStart(4, '0')}`
          
          const existing = await prisma.employee.findUnique({
            where: { employeeCode },
          })
          
          if (!existing) {
            isUnique = true
          } else {
            attempt++
          }
        }

        if (!isUnique) {
          throw new Error('Could not generate unique employee code')
        }

        await prisma.employee.create({
          data: {
            userId: newUser.id,
            employeeCode: employeeCode!,
            departmentId: data.departmentId,
          },
        })
      } catch (error) {
        // Log error but don't fail user creation if employee creation fails
        console.error('Error creating employee record:', error)
      }
    }

    const { passwordHash: _passwordHash, ...safeUser } = newUser

    return successResponse(safeUser, 'User created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse('Email already exists', 400)
    }
    console.error('Error creating user:', error)
    return errorResponse('Failed to create user', 500)
  }
}

