import { NextRequest } from 'next/server'
import { MonthlyPayrollStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const bulkStatusSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
  status: z.enum(['DRAFT', 'APPROVED', 'PAID']),
})

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:write')) return errorResponse('Forbidden', 403)

    const body = await request.json()
    const { ids, status } = bulkStatusSchema.parse(body)

    const updateData: { status: MonthlyPayrollStatus; approvedById?: string; paidAt?: Date } = { status }
    if (status === 'APPROVED') updateData.approvedById = user.id
    if (status === 'PAID') updateData.paidAt = new Date()

    const result = await prisma.monthlyPayroll.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return successResponse(
      { updated: result.count },
      `Updated ${result.count} payroll record(s) to ${status}`
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request: ids (array of IDs) and status (DRAFT|APPROVED|PAID) required', 400)
    }
    console.error('Bulk payroll status update error:', error)
    return errorResponse('Failed to update payroll status', 500)
  }
}
