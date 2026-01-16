import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const assignEmployeesSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: departmentId } = await params
    const body = await request.json()
    const { employeeIds } = assignEmployeesSchema.parse(body)

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      return errorResponse('Department not found', 404)
    }

    // Verify all employees exist
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
    })

    if (employees.length !== employeeIds.length) {
      return errorResponse('Some employees not found', 400)
    }

    // Update employees to assign them to the department
    await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: {
        departmentId: departmentId,
      },
    })

    // Fetch updated department with employees
    const updatedDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    return successResponse(updatedDepartment, 'Employees assigned successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error assigning employees:', error)
    return errorResponse('Failed to assign employees', 500)
  }
}
