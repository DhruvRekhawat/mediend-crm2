import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateEmployeeSchema = z.object({
  employeeCode: z.string().optional(),
  joinDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  dateOfBirth: z.string().transform((str) => new Date(str)).optional().nullable(),
  aadharNumber: z.string().max(12).optional().nullable(),
  panNumber: z.string().max(10).optional().nullable(),
  aadharDocUrl: z.string().url().optional().nullable().or(z.literal('')),
  panDocUrl: z.string().url().optional().nullable().or(z.literal('')),
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
    const data = updateEmployeeSchema.parse(body)

    // Check if employee code is being updated and is unique
    if (data.employeeCode) {
      const existing = await prisma.employee.findFirst({
        where: {
          employeeCode: data.employeeCode,
          id: { not: id },
        },
      })

      if (existing) {
        return errorResponse('Employee code already exists', 400)
      }
    }

    const updateData: Prisma.EmployeeUpdateInput = {}
    if (data.employeeCode !== undefined) updateData.employeeCode = data.employeeCode
    if (data.joinDate !== undefined) updateData.joinDate = data.joinDate
    if (data.salary !== undefined) updateData.salary = data.salary
    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId 
        ? { connect: { id: data.departmentId } }
        : { disconnect: true }
    }
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth
    if (data.aadharNumber !== undefined) updateData.aadharNumber = data.aadharNumber
    if (data.panNumber !== undefined) updateData.panNumber = data.panNumber
    if (data.aadharDocUrl !== undefined) updateData.aadharDocUrl = data.aadharDocUrl || null
    if (data.panDocUrl !== undefined) updateData.panDocUrl = data.panDocUrl || null

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
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

    return successResponse(updated, 'Employee updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating employee:', error)
    return errorResponse('Failed to update employee', 500)
  }
}

