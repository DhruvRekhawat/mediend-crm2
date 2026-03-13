/**
 * Leave policy calculator: monthly accrual, probation lock, EL carry-forward.
 *
 * Policy:
 * - 1 CL, 0.5 SL, 0.5 EL per month (2 total)
 * - First 6 months: accruals are locked. On month 7: 12 EL from locked pool + regular accrual
 * - CL/SL reset every month; EL carries forward year to year
 */

import type { LeaveTypeMaster, LeaveRequest } from '@/generated/prisma/client'

const PROBATION_MONTHS = 6
const PROBATION_EL_UNLOCK = 12

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

function monthsSinceJoin(joinDate: Date, asOfDate: Date): number {
  const j = new Date(joinDate)
  const a = new Date(asOfDate)
  j.setHours(0, 0, 0, 0)
  a.setHours(0, 0, 0, 0)
  const months = (a.getFullYear() - j.getFullYear()) * 12 + (a.getMonth() - j.getMonth())
  return Math.max(0, months)
}

function isInProbation(joinDate: Date | null, asOfDate: Date): boolean {
  if (!joinDate) return false
  const months = monthsSinceJoin(joinDate, asOfDate)
  return months < PROBATION_MONTHS
}

function getYear(d: Date): number {
  return new Date(d).getFullYear()
}

function getMonth(d: Date): number {
  return new Date(d).getMonth()
}

/** Sum approved leave days for a type in a date range (inclusive) */
function sumUsedInRange(
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  start: Date,
  end: Date
): number {
  let sum = 0
  const s = new Date(start)
  const e = new Date(end)
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)
  for (const l of approvedLeaves) {
    if (l.leaveTypeId !== leaveTypeId) continue
    const ls = new Date(l.startDate)
    const le = new Date(l.endDate)
    ls.setHours(0, 0, 0, 0)
    le.setHours(0, 0, 0, 0)
    const overlapStart = ls < s ? s : ls
    const overlapEnd = le > e ? e : le
    if (overlapStart <= overlapEnd) {
      const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      sum += Math.min(overlapDays, l.days)
    }
  }
  return sum
}

/** Sum approved leave days for a type in current month */
function sumUsedInMonth(
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  year: number,
  month: number
): number {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return sumUsedInRange(approvedLeaves, leaveTypeId, start, end)
}

/** Sum approved leave days for a type in a calendar year */
function sumUsedInYear(
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  year: number
): number {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  return sumUsedInRange(approvedLeaves, leaveTypeId, start, end)
}

/** EL remaining at end of year (carry forward = this value) */
function elRemainingAtEndOfYear(
  joinDate: Date,
  year: number,
  approvedLeaves: LeaveRequest[],
  leaveTypeId: string,
  monthlyAccrual: number,
  probationUnlock: number
): number {
  const joinYear = getYear(joinDate)
  if (year < joinYear) return 0

  const monthsCompletedAtYearEnd = monthsSinceJoin(joinDate, new Date(year, 11, 31))
  if (monthsCompletedAtYearEnd < PROBATION_MONTHS) return 0

  const month7 = new Date(joinDate)
  month7.setMonth(month7.getMonth() + PROBATION_MONTHS)
  const m7Year = getYear(month7)
  const m7Month = getMonth(month7)

  let allocated: number
  if (year === joinYear) {
    allocated = probationUnlock + (12 - m7Month) * monthlyAccrual
  } else {
    const carried = elRemainingAtEndOfYear(joinDate, year - 1, approvedLeaves, leaveTypeId, monthlyAccrual, probationUnlock)
    allocated = carried + 12 * monthlyAccrual
  }
  const used = sumUsedInYear(approvedLeaves, leaveTypeId, year)
  return Math.max(0, allocated - used)
}

/**
 * Compute current leave balances for an employee from policy + approved leave history.
 */
export function computeLeaveBalances(input: CalculatorInput): ComputedBalance[] {
  const { joinDate, asOfDate, leaveTypes, approvedLeaves } = input
  const asOf = new Date(asOfDate)
  const year = getYear(asOf)
  const month = getMonth(asOf)
  const probation = isInProbation(joinDate, asOf)
  const monthsCompleted = joinDate ? monthsSinceJoin(joinDate, asOf) : 999

  const result: ComputedBalance[] = []

  for (const lt of leaveTypes) {
    if (!lt.isActive) continue

    const monthlyAccrual = lt.monthlyAccrual ?? 0
    const carryForward = lt.carryForward ?? false
    const probationUnlock = lt.probationUnlockDays ?? 0

    let allocated = 0
    let used = 0
    let locked = 0

    if (carryForward) {
      // EL: carry forward, probation unlock on month 7
      if (probation) {
        locked = monthsCompleted * monthlyAccrual
        allocated = 0
        used = 0
      } else if (joinDate) {
        const joinYear = getYear(joinDate)
        const month7 = new Date(joinDate)
        month7.setMonth(month7.getMonth() + PROBATION_MONTHS)
        const m7Year = getYear(month7)
        const m7Month = getMonth(month7)

        if (year === joinYear) {
          allocated = probationUnlock + (month - m7Month + 1) * monthlyAccrual
        } else {
          const carried = elRemainingAtEndOfYear(joinDate, year - 1, approvedLeaves, lt.id, monthlyAccrual, probationUnlock)
          allocated = carried + (month + 1) * monthlyAccrual
        }
        used = sumUsedInRange(approvedLeaves, lt.id, new Date(year, 0, 1), asOf)
      } else {
        allocated = (month + 1) * monthlyAccrual
        used = sumUsedInRange(approvedLeaves, lt.id, new Date(year, 0, 1), asOf)
      }
    } else {
      // CL/SL: reset monthly
      if (probation) {
        locked = monthlyAccrual
        allocated = 0
        used = 0
      } else {
        allocated = monthlyAccrual
        used = sumUsedInMonth(approvedLeaves, lt.id, year, month)
      }
    }

    const remaining = Math.max(0, allocated - used)

    result.push({
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      leaveTypeCode: lt.code,
      allocated,
      used,
      remaining,
      locked,
      isProbation: probation,
      carryForward,
    })
  }

  return result
}

/** Fetch data and compute balances for an employee. Used by APIs. */
export async function getComputedBalancesForEmployee(
  employeeId: string,
  asOfDate: Date = new Date()
): Promise<ComputedBalance[]> {
  const { prisma } = await import('@/lib/prisma')
  const [employee, leaveTypes, approvedLeaves] = await Promise.all([
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
      select: { leaveTypeId: true, startDate: true, endDate: true, days: true },
    }),
  ])
  if (!employee) return []
  return computeLeaveBalances({
    employeeId,
    joinDate: employee.joinDate,
    asOfDate,
    leaveTypes,
    approvedLeaves: approvedLeaves as LeaveRequest[],
  })
}

/** Validate if employee can take requested days of a leave type (balance check) */
export function validateComputedBalance(
  balances: ComputedBalance[],
  leaveTypeId: string,
  requestedDays: number
): { valid: boolean; error?: string } {
  const bal = balances.find((b) => b.leaveTypeId === leaveTypeId)
  if (!bal) return { valid: false, error: 'Leave type not found' }
  if (bal.isProbation && bal.locked > 0) {
    return { valid: false, error: 'Leaves are locked during probation (first 6 months)' }
  }
  if (bal.remaining < requestedDays) {
    return {
      valid: false,
      error: `Insufficient leave balance. Available: ${bal.remaining}, Requested: ${requestedDays}`,
    }
  }
  return { valid: true }
}
