import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:read')) return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const departmentId = searchParams.get('departmentId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const where: Prisma.MonthlyPayrollWhereInput = {}
    if (employeeId) where.employeeId = employeeId
    if (month) where.month = parseInt(month, 10)
    if (year) where.year = parseInt(year, 10)
    if (status) where.status = status as 'DRAFT' | 'APPROVED' | 'PAID'
    if (departmentId) {
      where.employee = { departmentId }
    }

    const [records, total] = await Promise.all([
      prisma.monthlyPayroll.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              user: { select: { name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.monthlyPayroll.count({ where }),
    ])

    return successResponse({
      data: records,
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
