import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return errorResponse('Failed to fetch departments', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = createDepartmentSchema.parse(body)

    // Check if department name already exists
    const existing = await prisma.department.findFirst({
      where: {
        name: data.name,
      },
    })

    if (existing) {
      return errorResponse('Department name already exists', 400)
    }

    const department = await prisma.department.create({
      data,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    return successResponse(department, 'Department created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating department:', error)
    return errorResponse('Failed to create department', 500)
  }
}

// PATCH and DELETE are handled in [id]/route.ts

