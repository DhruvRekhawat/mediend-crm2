import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission, canAssignDepartmentHead } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  shiftStartHour: z.number().int().min(0).max(23).optional(),
  shiftStartMinute: z.number().int().min(0).max(59).optional(),
  grace1Minutes: z.number().int().min(0).max(60).optional(),
  grace2Minutes: z.number().int().min(0).max(60).optional(),
  penaltyMinutes: z.number().int().min(0).max(120).optional(),
  penaltyAmount: z.number().int().min(0).optional(),
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

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()
    const data = updateDepartmentSchema.parse(body)

    // Check if department name is being updated and is unique
    if (data.name) {
      const existing = await prisma.department.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      })

      if (existing) {
        return errorResponse('Department name already exists', 400)
      }
    }

    const updateData: Prisma.DepartmentUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.shiftStartHour !== undefined) updateData.shiftStartHour = data.shiftStartHour
    if (data.shiftStartMinute !== undefined) updateData.shiftStartMinute = data.shiftStartMinute
    if (data.grace1Minutes !== undefined) updateData.grace1Minutes = data.grace1Minutes
    if (data.grace2Minutes !== undefined) updateData.grace2Minutes = data.grace2Minutes
    if (data.penaltyMinutes !== undefined) updateData.penaltyMinutes = data.penaltyMinutes
    if (data.penaltyAmount !== undefined) updateData.penaltyAmount = data.penaltyAmount
    
    // Handle head assignment/reassignment (only for HR_HEAD, MD, ADMIN)
    if (data.headId !== undefined) {
      if (!canAssignDepartmentHead(user)) {
        return errorResponse('Only HR Head, MD, or Admin can assign/remove department heads', 403)
      }
      
      if (data.headId === null) {
        // Remove head
        updateData.head = { disconnect: true }
      } else {
        // Assign/reassign head

        // Validate head user exists and has department head role
        const headUser = await prisma.user.findUnique({
          where: { id: data.headId },
          select: { id: true, role: true },
        })

        if (!headUser) {
          return errorResponse('Head user not found', 400)
        }

        // Check if user has a department head role
        const deptHeadRoles = ['INSURANCE_HEAD', 'PL_HEAD', 'SALES_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'OUTSTANDING_HEAD', 'DIGITAL_MARKETING_HEAD', 'IT_HEAD']
        if (!deptHeadRoles.includes(headUser.role)) {
          return errorResponse('Selected user must have a department head role', 400)
        }

        // Check if user is already a head of another department
        const existingHeadDept = await prisma.department.findFirst({
          where: {
            headId: data.headId,
            id: { not: id }, // Exclude current department
          },
        })

        if (existingHeadDept) {
          return errorResponse('User is already a head of another department', 400)
        }

        updateData.head = { connect: { id: data.headId } }
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: updateData,
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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

    const { id } = await params

    // Check if department has employees
    const employeeCount = await prisma.employee.count({
      where: {
        departmentId: id,
      },
    })

    if (employeeCount > 0) {
      return errorResponse('Cannot delete department with employees', 400)
    }

    await prisma.department.delete({
      where: { id },
    })

    return successResponse(null, 'Department deleted successfully')
  } catch (error) {
    console.error('Error deleting department:', error)
    return errorResponse('Failed to delete department', 500)
  }
}
