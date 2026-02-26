import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const assignManagerSchema = z.object({
  employeeId: z.string(),
  managerId: z.string().nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hierarchy:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { employeeId, managerId } = assignManagerSchema.parse(body)

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })
    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    if (managerId !== null) {
      const manager = await prisma.employee.findUnique({
        where: { id: managerId },
      })
      if (!manager) {
        return errorResponse('Manager not found', 404)
      }
      if (managerId === employeeId) {
        return errorResponse('Employee cannot be their own manager', 400)
      }
      // Prevent circular reference: ensure manager is not a descendant of employee
      let currentId: string | null = managerId
      while (currentId) {
        const row: { managerId: string | null } | null = await prisma.employee.findUnique({
          where: { id: currentId },
          select: { managerId: true },
        })
        if (!row) break
        if (row.managerId === employeeId) {
          return errorResponse('Cannot create circular reporting relationship', 400)
        }
        currentId = row.managerId
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { managerId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        department: { select: { id: true, name: true } },
        manager: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    })

    return successResponse(updated, 'Manager assigned successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error assigning manager:', error)
    return errorResponse('Failed to assign manager', 500)
  }
}
