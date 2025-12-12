import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { initializeLeaveBalances } from '@/lib/hrms/leave-balance-utils'
import { z } from 'zod'

const updateEmployeeSchema = z.object({
  employeeCode: z.string().optional(),
  joinDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  departmentId: z.string().optional().nullable(),
})

const createEmployeeSchema = z.object({
  userId: z.string(),
  employeeCode: z.string(),
  joinDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  departmentId: z.string().optional().nullable(),
})

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
    const data = createEmployeeSchema.parse(body)

    // Check if employee already exists for this user
    const existing = await prisma.employee.findUnique({
      where: { userId: data.userId },
    })

    if (existing) {
      return errorResponse('Employee record already exists for this user', 400)
    }

    // Check if employee code is unique
    const codeExists = await prisma.employee.findUnique({
      where: { employeeCode: data.employeeCode },
    })

    if (codeExists) {
      return errorResponse('Employee code already exists', 400)
    }

    const employee = await prisma.employee.create({
      data: {
        userId: data.userId,
        employeeCode: data.employeeCode,
        joinDate: data.joinDate || null,
        salary: data.salary || null,
        departmentId: data.departmentId || null,
      },
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
    })

    // Initialize leave balances for the new employee
    await initializeLeaveBalances(employee.id)

    return successResponse(employee, 'Employee record created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating employee:', error)
    return errorResponse('Failed to create employee', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')

    const where: any = {}
    if (departmentId) {
      where.departmentId = departmentId
    }

    const employees = await prisma.employee.findMany({
      where,
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
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    return successResponse(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return errorResponse('Failed to fetch employees', 500)
  }
}

// PATCH is handled in [id]/route.ts

