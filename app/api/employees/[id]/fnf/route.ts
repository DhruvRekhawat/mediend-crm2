import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(_request)
    if (!user) return unauthorizedResponse()

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, status: true, fnfCompleted: true },
    })

    if (!employee) return errorResponse('Employee not found', 404)
    if (employee.status !== 'TERMINATED') {
      return errorResponse('FnF can only be marked for terminated employees', 400)
    }
    if (employee.fnfCompleted) {
      return errorResponse('FnF already marked as completed', 400)
    }

    await prisma.employee.update({
      where: { id },
      data: {
        fnfCompleted: true,
        fnfCompletedAt: new Date(),
        fnfCompletedById: user.id,
      },
    })

    return successResponse({ ok: true, message: 'FnF marked as completed' })
  } catch (error) {
    console.error('Error marking FnF:', error)
    return errorResponse('Failed to mark FnF', 500)
  }
}
