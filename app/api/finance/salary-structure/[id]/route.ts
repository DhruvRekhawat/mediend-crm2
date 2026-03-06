import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { calculateMonthlyGross, calculateSalaryBreakup } from '@/lib/hrms/salary-calculation'
import { z } from 'zod'

const updateSalaryStructureSchema = z.object({
  annualCtc: z.number().positive().optional(),
  basicSalary: z.number().min(0).optional(),
  medicalAllowance: z.number().min(0).optional(),
  conveyanceAllowance: z.number().min(0).optional(),
  otherAllowance: z.number().min(0).optional(),
  insuranceDeduction: z.number().min(0).optional(),
  applyPf: z.boolean().optional(),
  applyTds: z.boolean().optional(),
  tdsMonthly: z.number().min(0).optional(),
  tdsRatePercent: z.number().min(0).max(100).nullable().optional(),
  effectiveFrom: z.string().transform((s) => new Date(s)).optional(),
  effectiveTo: z.string().transform((s) => new Date(s)).nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:read')) return errorResponse('Forbidden', 403)

    const { id } = await params
    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            joinDate: true,
            user: { select: { name: true, email: true } },
            department: { select: { name: true } },
          },
        },
      },
    })
    if (!structure) return errorResponse('Salary structure not found', 404)
    return successResponse(structure)
  } catch (error) {
    console.error('Error fetching salary structure:', error)
    return errorResponse('Failed to fetch salary structure', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:write')) return errorResponse('Forbidden', 403)

    const { id } = await params
    const existing = await prisma.salaryStructure.findUnique({ where: { id } })
    if (!existing) return errorResponse('Salary structure not found', 404)

    const body = await request.json()
    const data = updateSalaryStructureSchema.parse(body)

    const annualCtc = data.annualCtc ?? existing.annualCtc
    const basicSalary = data.basicSalary ?? existing.basicSalary
    const applyPf = data.applyPf ?? existing.applyPf
    const monthlyGross = calculateMonthlyGross(annualCtc, basicSalary, applyPf)
    const medicalAllowance = data.medicalAllowance ?? existing.medicalAllowance
    const conveyanceAllowance = data.conveyanceAllowance ?? existing.conveyanceAllowance
    const otherAllowance = data.otherAllowance ?? existing.otherAllowance

    const breakup = calculateSalaryBreakup(
      monthlyGross,
      basicSalary,
      medicalAllowance,
      conveyanceAllowance,
      otherAllowance
    )
    if (breakup.specialAllowance < 0) {
      return errorResponse('Sum of basic + medical + conveyance + other exceeds monthly gross', 400)
    }

    const structure = await prisma.salaryStructure.update({
      where: { id },
      data: {
        ...(data.annualCtc != null && { annualCtc }),
        monthlyGross,
        basicSalary: breakup.basicSalary,
        medicalAllowance: breakup.medicalAllowance,
        conveyanceAllowance: breakup.conveyanceAllowance,
        otherAllowance: breakup.otherAllowance,
        specialAllowance: breakup.specialAllowance,
        ...(data.insuranceDeduction != null && { insuranceDeduction: data.insuranceDeduction }),
        ...(data.applyPf != null && { applyPf: data.applyPf }),
        ...(data.applyTds != null && { applyTds: data.applyTds }),
        ...(data.tdsMonthly != null && { tdsMonthly: data.tdsMonthly }),
        ...(data.tdsRatePercent !== undefined && { tdsRatePercent: data.tdsRatePercent }),
        ...(data.effectiveFrom != null && { effectiveFrom: data.effectiveFrom }),
        ...(data.effectiveTo !== undefined && { effectiveTo: data.effectiveTo }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })
    return successResponse(structure, 'Salary structure updated')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating salary structure:', error)
    return errorResponse('Failed to update salary structure', 500)
  }
}
