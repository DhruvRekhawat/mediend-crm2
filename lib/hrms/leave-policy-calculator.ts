/**
 * Leave policy calculator.
 *
 * Policy:
 * - 1 CL, 0.5 SL, 0.5 EL per month
 * - First 6 months: accruals are locked
 * - On month 7: probation accrual unlocks as 12 EL, plus normal month-7 accrual
 * - CL/SL reset yearly
 * - EL carries forward yearly
 *
 * Imported Feb balances:
 * - `prisma/leave-balance-updates.sql` imports a current balance snapshot after Feb 2026 adjustments
 * - For imported employees, that snapshot is treated as the opening balance as of Feb-end 2026
 * - From Mar 2026 onward, normal accrual + approved leaves are layered on top of that snapshot
 */

import type { LeaveBalance, LeaveRequest, LeaveTypeMaster } from '@/generated/prisma/client'

const PROBATION_MONTHS = 6
const IMPORT_BASELINE_YEAR = 2026
const IMPORT_POST_BASELINE_START = new Date(2026, 2, 1)

export interface ComputedBalance {
  leaveTypeId: string
  leaveTypeName: string
  leaveTypeCode: string | null
  allocated: number
  used: number
  remaining: number
  locked: number
  isProbation: boolean
  carryForward: boolean
}

export interface CalculatorInput {
  employeeId: string
  joinDate: Date | null
  asOfDate: Date
  leaveTypes: LeaveTypeMaster[]
  approvedLeaves: LeaveRequest[]
}

type StoredBalanceSnapshot = Pick<LeaveBalance, 'leaveTypeId' | 'allocated' | 'used' | 'remaining'>

const DEFAULT_LEAVE_TYPES = [
  { name: 'CL', code: 'CL', maxDays: 12, monthlyAccrual: 1, carryForward: false, probationUnlockDays: null },
  { name: 'SL', code: 'SL', maxDays: 6, monthlyAccrual: 0.5, carryForward: false, probationUnlockDays: null },
  { name: 'EL', code: 'EL', maxDays: 18, monthlyAccrual: 0.5, carryForward: true, probationUnlockDays: 12 },
] as const

function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function startOfYear(value: Date): Date {
  return new Date(value.getFullYear(), 0, 1)
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31)
}

function addMonths(value: Date, months: number): Date {
  const date = new Date(value)
  date.setMonth(date.getMonth() + months)
  return date
}

function getYear(value: Date): number {
  return new Date(value).getFullYear()
}

function monthNumber(value: Date): number {
  const date = new Date(value)
  return date.getFullYear() * 12 + date.getMonth()
}

function countAccrualMonths(start: Date, end: Date): number {
  const startMonth = startOfMonth(start)
  const endMonth = startOfMonth(end)
  if (endMonth < startMonth) return 0
  return monthNumber(endMonth) - monthNumber(startMonth) + 1
}

function monthsSinceJoin(joinDate: Date, asOfDate: Date): number {
  return Math.max(0, monthNumber(startOfMonth(asOfDate)) - monthNumber(startOfMonth(joinDate)))
}

function monthsAccruedDuringProbation(joinDate: Date, asOfDate: Date): number {
  return Math.min(PROBATION_MONTHS, monthsSinceJoin(joinDate, asOfDate) + 1)
}

function isInProbation(joinDate: Date | null, asOfDate: Date): boolean {
  if (!joinDate) return false
  return monthsSinceJoin(joinDate, asOfDate) < PROBATION_MONTHS
}

function getProbationUnlockMonth(joinDate: Date): Date {
  return startOfMonth(addMonths(joinDate, PROBATION_MONTHS))
}

/** Sum approved leave days for a type in a date range (inclusive). */
function sumUsedInRange(
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  start: Date,
  end: Date
): number {
  let sum = 0
  const s = startOfDay(start)
  const e = startOfDay(end)

  for (const leave of approvedLeaves) {
    if (leave.leaveTypeId !== leaveTypeId) continue
    if (leave.isUnpaid) continue

    const leaveStart = startOfDay(new Date(leave.startDate))
    const leaveEnd = startOfDay(new Date(leave.endDate))
    const overlapStart = leaveStart < s ? s : leaveStart
    const overlapEnd = leaveEnd > e ? e : leaveEnd

    if (overlapStart <= overlapEnd) {
      const overlapDays =
        Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      sum += Math.min(overlapDays, leave.days)
    }
  }

  return sum
}

function computePolicyElRemainingAtEndOfYear(
  joinDate: Date | null,
  year: number,
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  monthlyAccrual: number,
  probationUnlock: number
): number {
  if (!joinDate) {
    const allocated = 12 * monthlyAccrual
    const used = sumUsedInRange(approvedLeaves, leaveTypeId, new Date(year, 0, 1), endOfYear(year))
    return Math.max(0, allocated - used)
  }

  const unlockMonth = getProbationUnlockMonth(joinDate)
  const unlockYear = getYear(unlockMonth)
  if (year < unlockYear) return 0

  let carry = 0
  for (let currentYear = unlockYear; currentYear <= year; currentYear += 1) {
    if (currentYear === unlockYear) {
      const allocated = probationUnlock + countAccrualMonths(unlockMonth, endOfYear(currentYear)) * monthlyAccrual
      const used = sumUsedInRange(
        approvedLeaves,
        leaveTypeId,
        new Date(currentYear, 0, 1),
        endOfYear(currentYear)
      )
      carry = Math.max(0, allocated - used)
      continue
    }

    const allocated = carry + 12 * monthlyAccrual
    const used = sumUsedInRange(
      approvedLeaves,
      leaveTypeId,
      new Date(currentYear, 0, 1),
      endOfYear(currentYear)
    )
    carry = Math.max(0, allocated - used)
  }

  return carry
}

function computeImportedElRemainingAtEndOfYear(
  baselineRemaining: number,
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  monthlyAccrual: number,
  targetYear: number
): number {
  let remaining = baselineRemaining

  for (let year = IMPORT_BASELINE_YEAR; year <= targetYear; year += 1) {
    const yearStart = year === IMPORT_BASELINE_YEAR ? IMPORT_POST_BASELINE_START : new Date(year, 0, 1)
    const yearEnd = endOfYear(year)
    const accruals = countAccrualMonths(yearStart, yearEnd) * monthlyAccrual
    const used = sumUsedInRange(approvedLeaves, leaveTypeId, yearStart, yearEnd)
    remaining = Math.max(0, remaining + accruals - used)
  }

  return remaining
}

function overlayImportedBalance(
  computed: ComputedBalance,
  leaveType: LeaveTypeMaster,
  stored: StoredBalanceSnapshot,
  approvedLeaves: LeaveRequest[],
  asOfDate: Date
): ComputedBalance {
  const asOf = startOfDay(asOfDate)
  if (asOf < IMPORT_POST_BASELINE_START) {
    return {
      ...computed,
      allocated: stored.allocated,
      used: stored.used,
      remaining: stored.remaining,
    }
  }

  const monthlyAccrual = leaveType.monthlyAccrual ?? 0
  const carryForward = leaveType.carryForward ?? false
  const baselineRemaining = stored.remaining
  const year = getYear(asOf)

  if (!carryForward) {
    if (year === IMPORT_BASELINE_YEAR) {
      const accruals = countAccrualMonths(IMPORT_POST_BASELINE_START, asOf) * monthlyAccrual
      const used = sumUsedInRange(approvedLeaves, leaveType.id, IMPORT_POST_BASELINE_START, asOf)
      const allocated = baselineRemaining + accruals
      return {
        ...computed,
        allocated,
        used,
        remaining: Math.max(0, allocated - used),
      }
    }

    const yearStart = new Date(year, 0, 1)
    const allocated = countAccrualMonths(yearStart, asOf) * monthlyAccrual
    const used = sumUsedInRange(approvedLeaves, leaveType.id, yearStart, asOf)
    return {
      ...computed,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
    }
  }

  if (year === IMPORT_BASELINE_YEAR) {
    const accruals = countAccrualMonths(IMPORT_POST_BASELINE_START, asOf) * monthlyAccrual
    const used = sumUsedInRange(approvedLeaves, leaveType.id, IMPORT_POST_BASELINE_START, asOf)
    const allocated = baselineRemaining + accruals
    return {
      ...computed,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
    }
  }

  const carried = computeImportedElRemainingAtEndOfYear(
    baselineRemaining,
    approvedLeaves,
    leaveType.id,
    monthlyAccrual,
    year - 1
  )
  const yearStart = new Date(year, 0, 1)
  const allocated = carried + countAccrualMonths(yearStart, asOf) * monthlyAccrual
  const used = sumUsedInRange(approvedLeaves, leaveType.id, yearStart, asOf)
  return {
    ...computed,
    allocated,
    used,
    remaining: Math.max(0, allocated - used),
  }
}

/**
 * Compute current leave balances for an employee from policy + approved leave history.
 */
export function computeLeaveBalances(input: CalculatorInput): ComputedBalance[] {
  const { joinDate, asOfDate, leaveTypes, approvedLeaves } = input
  const asOf = startOfDay(new Date(asOfDate))
  const yearStart = startOfYear(asOf)
  const probation = isInProbation(joinDate, asOf)

  return leaveTypes
    .filter((leaveType) => leaveType.isActive)
    .map((leaveType) => {
      const monthlyAccrual = leaveType.monthlyAccrual ?? 0
      const carryForward = leaveType.carryForward ?? false
      const probationUnlock = leaveType.probationUnlockDays ?? 0

      let allocated = 0
      let used = 0
      let locked = 0

      if (joinDate && probation) {
        locked = monthsAccruedDuringProbation(joinDate, asOf) * monthlyAccrual
      } else if (carryForward) {
        if (!joinDate) {
          allocated = countAccrualMonths(yearStart, asOf) * monthlyAccrual
        } else {
          const unlockMonth = getProbationUnlockMonth(joinDate)
          const unlockYear = getYear(unlockMonth)
          const currentYear = getYear(asOf)

          if (currentYear === unlockYear) {
            if (asOf >= unlockMonth) {
              allocated = probationUnlock + countAccrualMonths(unlockMonth, asOf) * monthlyAccrual
            }
          } else if (currentYear > unlockYear) {
            const carried = computePolicyElRemainingAtEndOfYear(
              joinDate,
              currentYear - 1,
              approvedLeaves,
              leaveType.id,
              monthlyAccrual,
              probationUnlock
            )
            allocated = carried + countAccrualMonths(yearStart, asOf) * monthlyAccrual
          }
        }

        used = sumUsedInRange(approvedLeaves, leaveType.id, yearStart, asOf)
      } else {
        let accrualStart = yearStart
        if (joinDate) {
          const unlockMonth = getProbationUnlockMonth(joinDate)
          if (unlockMonth > accrualStart) {
            accrualStart = unlockMonth
          }
        }

        if (asOf >= accrualStart) {
          allocated = countAccrualMonths(accrualStart, asOf) * monthlyAccrual
        }
        used = sumUsedInRange(approvedLeaves, leaveType.id, yearStart, asOf)
      }

      return {
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        leaveTypeCode: leaveType.code,
        allocated,
        used,
        remaining: Math.max(0, allocated - used),
        locked,
        isProbation: probation,
        carryForward,
      }
    })
}

/** Ensure CL, SL, EL exist and are active so balance computation can run. */
export async function ensureDefaultLeaveTypes(): Promise<void> {
  const { prisma } = await import('@/lib/prisma')

  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveTypeMaster.findFirst({
      where: { name: leaveType.name },
    })

    if (!existing) {
      await prisma.leaveTypeMaster.create({
        data: {
          name: leaveType.name,
          code: leaveType.code,
          maxDays: leaveType.maxDays,
          monthlyAccrual: leaveType.monthlyAccrual,
          carryForward: leaveType.carryForward,
          probationUnlockDays: leaveType.probationUnlockDays,
          isActive: true,
        },
      })
      continue
    }

    await prisma.leaveTypeMaster.update({
      where: { id: existing.id },
      data: {
        code: leaveType.code,
        monthlyAccrual: leaveType.monthlyAccrual,
        carryForward: leaveType.carryForward,
        probationUnlockDays: leaveType.probationUnlockDays,
        isActive: true,
      },
    })
  }
}

export async function getComputedBalancesForEmployee(
  employeeId: string,
  asOfDate: Date = new Date()
): Promise<ComputedBalance[]> {
  const { prisma } = await import('@/lib/prisma')

  const [employee, leaveTypes, approvedLeaves, storedBalances] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { joinDate: true },
    }),
    prisma.leaveTypeMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
      },
      select: {
        leaveTypeId: true,
        startDate: true,
        endDate: true,
        days: true,
        isUnpaid: true,
      },
    }),
    prisma.leaveBalance.findMany({
      where: { employeeId },
      select: {
        leaveTypeId: true,
        allocated: true,
        used: true,
        remaining: true,
      },
    }),
  ])

  if (!employee) return []

  let activeLeaveTypes = leaveTypes
  if (activeLeaveTypes.length === 0) {
    await ensureDefaultLeaveTypes()
    activeLeaveTypes = await prisma.leaveTypeMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  const computed = computeLeaveBalances({
    employeeId,
    joinDate: employee.joinDate,
    asOfDate,
    leaveTypes: activeLeaveTypes,
    approvedLeaves: approvedLeaves as LeaveRequest[],
  })

  const leaveTypeById = new Map(activeLeaveTypes.map((leaveType) => [leaveType.id, leaveType]))
  const storedBalanceByType = new Map(storedBalances.map((balance) => [balance.leaveTypeId, balance]))

  return computed.map((balance) => {
    const leaveType = leaveTypeById.get(balance.leaveTypeId)
    const stored = storedBalanceByType.get(balance.leaveTypeId)
    if (!leaveType || !stored) return balance

    return overlayImportedBalance(balance, leaveType, stored, approvedLeaves as LeaveRequest[], asOfDate)
  })
}

/** Validate if employee can take requested days of a leave type (balance check). */
export function validateComputedBalance(
  balances: ComputedBalance[],
  leaveTypeId: string,
  requestedDays: number
): { valid: boolean; error?: string } {
  const balance = balances.find((item) => item.leaveTypeId === leaveTypeId)
  if (!balance) {
    return { valid: false, error: 'Leave type not found' }
  }

  if (balance.isProbation && balance.locked > 0) {
    return { valid: false, error: 'Leaves are locked during probation (first 6 months)' }
  }

  if (balance.remaining < requestedDays) {
    return {
      valid: false,
      error: `Insufficient leave balance. Available: ${balance.remaining}, Requested: ${requestedDays}`,
    }
  }

  return { valid: true }
}
