import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = updateDepartmentSchema.parse(body)

    // Check if department name is being updated and is unique
    if (data.name) {
      const existing = await prisma.department.findFirst({
        where: {
          name: data.name,
          id: { not: params.id },
        },
      })

      if (existing) {
        return errorResponse('Department name already exists', 400)
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description

    const updated = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    return successResponse(updated, 'Department updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating department:', error)
    return errorResponse('Failed to update department', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    // Check if department has employees
    const employeeCount = await prisma.employee.count({
      where: {
        departmentId: params.id,
      },
    })

    if (employeeCount > 0) {
      return errorResponse('Cannot delete department with employees', 400)
    }

    await prisma.department.delete({
      where: { id: params.id },
    })

    return successResponse(null, 'Department deleted successfully')
  } catch (error) {
    console.error('Error deleting department:', error)
    return errorResponse('Failed to delete department', 500)
  }
}
