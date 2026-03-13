import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const patchSchema = z.object({
  balances: z.object({
    CL: z.number().min(0).optional(),
    SL: z.number().min(0).optional(),
    EL: z.number().min(0).optional(),
  }),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { employeeId } = await params
    const body = await request.json()
    const { balances } = patchSchema.parse(body)

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { name: true } } },
    })
    if (!employee) return errorResponse('Employee not found', 404)

    const codes = (Object.keys(balances) as (keyof typeof balances)[]).filter(
      (k) => balances[k] != null
    )
    const leaveTypes = await prisma.leaveTypeMaster.findMany({
      where: { code: { in: codes }, isActive: true },
    })
    const byCode = new Map(leaveTypes.map((lt) => [lt.code ?? lt.name, lt]))

    for (const code of codes) {
      const remaining = balances[code]!
      const lt = byCode.get(code)
      if (!lt) continue

      const value = Math.round(remaining * 2) / 2 // allow 0.5 steps

      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId: { employeeId, leaveTypeId: lt.id },
        },
        create: {
          employeeId,
          leaveTypeId: lt.id,
          allocated: value,
          used: 0,
          remaining: value,
        },
        update: {
          allocated: value,
          used: 0,
          remaining: value,
        },
      })
    }

    return successResponse({ message: 'Balances updated' })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return errorResponse(`Invalid request: ${e.errors.map((x) => x.message).join(', ')}`, 400)
    }
    console.error('Error updating leave balances:', e)
    return errorResponse('Failed to update balances', 500)
  }
}
