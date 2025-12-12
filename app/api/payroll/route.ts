import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { calculatePayroll } from '@/lib/hrms/payroll-utils'
import { PayrollComponentType } from '@prisma/client'
import { z } from 'zod'

const createPayrollSchema = z.object({
  employeeId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  disbursedAt: z.string().transform((str) => new Date(str)),
  basicSalary: z.number().positive(),
  components: z.array(
    z.object({
      componentType: z.enum(['ALLOWANCE', 'DEDUCTION']),
      name: z.string(),
      amount: z.number().nonnegative(),
    })
  ),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:payroll:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (employeeId) {
      where.employeeId = employeeId
    }
    if (month) {
      where.month = parseInt(month)
    }
    if (year) {
      where.year = parseInt(year)
    }

    const [payrollRecords, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          components: true,
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollRecord.count({ where }),
    ])

    return successResponse({
      data: payrollRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payroll records:', error)
    return errorResponse('Failed to fetch payroll records', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:payroll:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = createPayrollSchema.parse(body)

    // Check for duplicate
    const existing = await prisma.payrollRecord.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: data.employeeId,
          month: data.month,
          year: data.year,
        },
      },
    })

    if (existing) {
      return errorResponse('Payroll record already exists for this month', 400)
    }

    // Calculate payroll
    const calculation = calculatePayroll(
      data.basicSalary,
      data.components.map((c) => ({
        componentType: c.componentType as PayrollComponentType,
        amount: c.amount,
      }))
    )

    // Create payroll record
    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        disbursedAt: data.disbursedAt,
        basicSalary: calculation.basicSalary,
        grossSalary: calculation.grossSalary,
        netSalary: calculation.netSalary,
        components: {
          create: data.components.map((c) => ({
            componentType: c.componentType as PayrollComponentType,
            name: c.name,
            amount: c.amount,
          })),
        },
      },
      include: {
        components: true,
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return successResponse(payrollRecord, 'Payroll record created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating payroll record:', error)
    return errorResponse('Failed to create payroll record', 500)
  }
}

