import { prisma } from '@/lib/prisma'
import { differenceInMonths } from 'date-fns'

export interface ComputedBalance {
  leaveTypeId: string
  leaveTypeName: string
  allocated: number
  used: number
  remaining: number
  locked: number
  carryForward: boolean
  isProbation: boolean
}

const PROBATION_MONTHS = 6

/**
 * Compute leave balances from policy: monthly accrual + approved leave history.
 * Policy: CL 1/month, SL 0.5/month, EL 0.5/month + 12 unlock after 6 months.
 */
export async function getComputedBalancesForEmployee(
  employeeId: string
): Promise<ComputedBalance[]> {
  const [employee, leaveTypes, approvedLeaves] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { joinDate: true },
    }),
    prisma.leaveTypeMaster.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        monthlyAccrual: true,
        carryForward: true,
        probationUnlockDays: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
      },
      select: { leaveTypeId: true, days: true },
    }),
  ])

  const joinDate = employee?.joinDate
  const now = new Date()
  const isProbation = joinDate
    ? differenceInMonths(now, joinDate) < PROBATION_MONTHS
    : false

  const usedByLeaveType = new Map<string, number>()
  for (const l of approvedLeaves) {
    usedByLeaveType.set(l.leaveTypeId, (usedByLeaveType.get(l.leaveTypeId) ?? 0) + l.days)
  }

  const balances: ComputedBalance[] = leaveTypes.map((lt) => {
    let allocated = 0
    let locked = 0

    if (joinDate) {
      const monthsWorked = Math.max(0, differenceInMonths(now, joinDate))
      allocated = monthsWorked * lt.monthlyAccrual

      // EL: probationUnlockDays (12) added after 6 months
      if (lt.probationUnlockDays != null && monthsWorked >= PROBATION_MONTHS) {
        allocated += lt.probationUnlockDays
      }

      // During probation, allocated is locked
      if (isProbation) {
        locked = allocated
      }
    }

    const used = usedByLeaveType.get(lt.id) ?? 0
    const remaining = Math.max(0, allocated - used)

    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      allocated,
      used,
      remaining,
      locked,
      carryForward: lt.carryForward,
      isProbation,
    }
  })

  return balances
}

export interface ValidateBalanceResult {
  valid: boolean
  error?: string
}

/**
 * Validate that an employee has sufficient balance for a leave request.
 */
export function validateComputedBalance(
  balances: ComputedBalance[],
  leaveTypeId: string,
  days: number
): ValidateBalanceResult {
  const balance = balances.find((b) => b.leaveTypeId === leaveTypeId)
  if (!balance) {
    return { valid: false, error: 'Leave type not found' }
  }

  const available = balance.remaining
  if (available < days) {
    return {
      valid: false,
      error: `Insufficient leave balance. Available: ${available}, Requested: ${days}`,
    }
  }

  return { valid: true }
}
