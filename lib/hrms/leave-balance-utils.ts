import { prisma } from '@/lib/prisma'

const PROBATION_MONTHS = 6

function isInProbation(joinDate: Date | null): boolean {
  if (!joinDate) return false
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - PROBATION_MONTHS)
  return new Date(joinDate) > sixMonthsAgo
}

/**
 * Initialize leave balances for an employee.
 * First 6 months (probation): allocated = 0, remaining = 0.
 * After probation: allocated = leaveType.maxDays, remaining = maxDays.
 */
export async function initializeLeaveBalances(employeeId: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { joinDate: true },
  })

  const inProbation = isInProbation(employee?.joinDate ?? null)
  const allocated = inProbation ? 0 : undefined
  const remaining = inProbation ? 0 : undefined

  const leaveTypes = await prisma.leaveTypeMaster.findMany({
    where: { isActive: true },
  })

  for (const leaveType of leaveTypes) {
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId,
          leaveTypeId: leaveType.id,
        },
      },
    })

    if (!existing) {
      await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId: leaveType.id,
          allocated: allocated ?? leaveType.maxDays,
          used: 0,
          remaining: remaining ?? leaveType.maxDays,
        },
      })
    }
  }
}

/**
 * Ensure leave balance exists, create if missing.
 * Probation (first 6 months): allocated and remaining = 0.
 */
export async function ensureLeaveBalance(
  employeeId: string,
  leaveTypeId: string
): Promise<void> {
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId: {
        employeeId,
        leaveTypeId,
      },
    },
  })

  if (!balance) {
    const [employee, leaveType] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { joinDate: true },
      }),
      prisma.leaveTypeMaster.findUnique({
        where: { id: leaveTypeId },
      }),
    ])

    if (leaveType) {
      const inProbation = isInProbation(employee?.joinDate ?? null)
      const allocated = inProbation ? 0 : leaveType.maxDays
      const remaining = inProbation ? 0 : leaveType.maxDays
      await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId,
          allocated,
          used: 0,
          remaining,
        },
      })
    }
  }
}

