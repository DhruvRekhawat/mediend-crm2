import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { calculateMonthlyGross, calculateSalaryBreakup } from '@/lib/hrms/salary-calculation'
import { z } from 'zod'

const createSalaryStructureSchema = z.object({
  employeeId: z.string(),
  annualCtc: z.number().positive(),
  basicSalary: z.number().min(0),
  medicalAllowance: z.number().min(0).default(1500),
  conveyanceAllowance: z.number().min(0).default(2150),
  otherAllowance: z.number().min(0).default(0),
  insuranceDeduction: z.number().min(0).default(0),
  applyTds: z.boolean().default(false),
  tdsMonthly: z.number().min(0).default(0),
  tdsRatePercent: z.number().min(0).max(100).nullable().optional(),
  effectiveFrom: z.string().transform((s) => new Date(s)),
  effectiveTo: z.string().transform((s) => new Date(s)).nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:read')) return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (employeeId) {
      const structures = await prisma.salaryStructure.findMany({
        where: { employeeId },
        orderBy: { effectiveFrom: 'desc' },
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
      return successResponse(structures)
    }

    const structures = await prisma.salaryStructure.findMany({
      orderBy: [{ employeeId: 'asc' }, { effectiveFrom: 'desc' }],
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
    return successResponse(structures)
  } catch (error) {
    console.error('Error fetching salary structures:', error)
    return errorResponse('Failed to fetch salary structures', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:write')) return errorResponse('Forbidden', 403)

    const body = await request.json()
    const data = createSalaryStructureSchema.parse(body)

    const monthlyGross = calculateMonthlyGross(data.annualCtc)
    const breakup = calculateSalaryBreakup(
      monthlyGross,
      data.basicSalary,
      data.medicalAllowance,
      data.conveyanceAllowance,
      data.otherAllowance
    )
    if (breakup.specialAllowance < 0) {
      return errorResponse('Sum of basic + medical + conveyance + other exceeds monthly gross', 400)
    }

    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId: data.employeeId,
        annualCtc: data.annualCtc,
        monthlyGross,
        basicSalary: breakup.basicSalary,
        medicalAllowance: breakup.medicalAllowance,
        conveyanceAllowance: breakup.conveyanceAllowance,
        otherAllowance: breakup.otherAllowance,
        specialAllowance: breakup.specialAllowance,
        insuranceDeduction: data.insuranceDeduction,
        applyTds: data.applyTds,
        tdsMonthly: data.tdsMonthly,
        tdsRatePercent: data.tdsRatePercent ?? null,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo ?? null,
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
    return successResponse(structure, 'Salary structure created')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating salary structure:', error)
    return errorResponse('Failed to create salary structure', 500)
  }
}
