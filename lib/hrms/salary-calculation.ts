/**
 * Payroll salary calculation engine.
 * Handles CTC → gross, component breakup, pro-rata, EPF, ESIC, TDS, net pay.
 * ESIC: applicable only when monthly gross ≤ 21,100.
 */

export const ESIC_GROSS_THRESHOLD = 21_100
export const EPF_RATE = 0.12
export const ESIC_EMPLOYEE_RATE = 0.0075

export interface SalaryBreakup {
  basicSalary: number
  medicalAllowance: number
  conveyanceAllowance: number
  otherAllowance: number
  specialAllowance: number
  monthlyGross: number
}

export interface ProRatedSalary {
  adjustedBasic: number
  adjustedMedical: number
  adjustedConveyance: number
  adjustedOther: number
  adjustedSpecial: number
  adjustedGross: number
}

export interface AttendanceSummaryForPayroll {
  totalDaysInMonth: number
  fullDays: number
  halfDays: number
  unpaidLeaves: number
  payableDays: number
  normalizedDays?: number
}

/** Monthly gross from annual CTC (CTC minus 12% PF, then divided by 12), rounded up to whole rupees */
export function calculateMonthlyGross(annualCtc: number): number {
  return Math.ceil((annualCtc * (1 - 0.12)) / 12)
}

/** Salary component breakup. Special allowance is the balancing figure. */
export function calculateSalaryBreakup(
  monthlyGross: number,
  basicSalary: number,
  medicalAllowance: number,
  conveyanceAllowance: number,
  otherAllowance: number
): SalaryBreakup {
  const specialAllowance = Math.max(
    0,
    monthlyGross - (basicSalary + medicalAllowance + conveyanceAllowance + otherAllowance)
  )
  return {
    basicSalary,
    medicalAllowance,
    conveyanceAllowance,
    otherAllowance,
    specialAllowance,
    monthlyGross,
  }
}

/** Payable days = total calendar days - unpaid leave days. Half days count as 0.5 each. */
export function calculatePayableDays(
  totalDaysInMonth: number,
  unpaidLeaves: number,
  halfDays: number = 0
): number {
  const halfDayDeduction = halfDays * 0.5
  const payable = totalDaysInMonth - unpaidLeaves - halfDayDeduction
  return Math.max(0, Math.round(payable * 100) / 100)
}

/** Pro-rate a single component by payable days / total days, rounded to nearest rupee */
export function proRateComponent(
  amount: number,
  payableDays: number,
  totalDaysInMonth: number
): number {
  if (totalDaysInMonth <= 0) return 0
  const ratio = payableDays / totalDaysInMonth
  return Math.ceil(amount * ratio)
}

/** Pro-rate all salary components; adjustedGross = sum of adjusted components (round each then sum). */
export function calculateProRatedSalary(
  structure: SalaryBreakup,
  payableDays: number,
  totalDaysInMonth: number
): ProRatedSalary {
  const factor = totalDaysInMonth > 0 ? payableDays / totalDaysInMonth : 0
  const adjustedBasic = Math.ceil(structure.basicSalary * factor)
  const adjustedMedical = Math.ceil(structure.medicalAllowance * factor)
  const adjustedConveyance = Math.ceil(structure.conveyanceAllowance * factor)
  const adjustedOther = Math.ceil(structure.otherAllowance * factor)
  const adjustedSpecial = Math.ceil(structure.specialAllowance * factor)
  const adjustedGross =
    adjustedBasic + adjustedMedical + adjustedConveyance + adjustedOther + adjustedSpecial
  return {
    adjustedBasic,
    adjustedMedical,
    adjustedConveyance,
    adjustedOther,
    adjustedSpecial,
    adjustedGross,
  }
}

/** EPF employee share: 12% of adjusted basic */
export function calculateEPF(adjustedBasic: number): number {
  return Math.ceil(adjustedBasic * EPF_RATE)
}

/** ESIC employee: 0 if monthly gross > 21,100; else 0.75% of adjusted gross */
export function calculateESIC(adjustedGross: number, monthlyGross: number): number {
  if (monthlyGross > ESIC_GROSS_THRESHOLD) return 0
  return Math.ceil(adjustedGross * ESIC_EMPLOYEE_RATE)
}

/** TDS: when applyTds and tdsRatePercent set, amount = rate% of base (e.g. adjusted gross); else use fixed tdsMonthly */
export function calculateTDSAmount(
  adjustedGross: number,
  tdsMonthly: number,
  tdsRatePercent: number | null
): number {
  if (tdsRatePercent != null && tdsRatePercent > 0) {
    return Math.ceil((adjustedGross * tdsRatePercent) / 100)
  }
  return Math.ceil(tdsMonthly)
}

/** Net payable = adjusted gross - (EPF + ESIC + insurance + TDS) */
export function calculateNetPay(
  adjustedGross: number,
  epfEmployee: number,
  esicAmount: number,
  insurance: number,
  tdsAmount: number
): number {
  const totalDeductions = epfEmployee + esicAmount + insurance + tdsAmount
  return Math.max(0, Math.ceil(adjustedGross - totalDeductions))
}

/** Employer PF: 12% of adjusted basic */
export function calculateEPFEmployer(adjustedBasic: number): number {
  return Math.ceil(adjustedBasic * EPF_RATE)
}

/** Whether ESIC applies by rule (monthly gross ≤ 21,100) */
export function isESICApplicableByRule(monthlyGross: number): boolean {
  return monthlyGross <= ESIC_GROSS_THRESHOLD
}

/** Calendar days in month (28–31) */
export function getCalendarDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/** Convert number to Indian Rupees in words (lakhs, crores) */
export function numberToWordsINR(amount: number): string {
  const n = Math.floor(amount)
  if (n === 0) return 'Zero Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  function toWordsUpTo99(num: number): string {
    if (num === 0) return ''
    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    const t = Math.floor(num / 10)
    const o = num % 10
    return tens[t] + (o > 0 ? ' ' + ones[o] : '')
  }

  function toWordsUpTo999(num: number): string {
    if (num === 0) return ''
    const h = Math.floor(num / 100)
    const rest = num % 100
    const part = h > 0 ? ones[h] + ' Hundred' + (rest > 0 ? ' ' : '') : ''
    return part + toWordsUpTo99(rest)
  }

  let r = n
  const crore = Math.floor(r / 1_00_00_000)
  r = r % 1_00_00_000
  const lakh = Math.floor(r / 1_00_000)
  r = r % 1_00_000
  const thousand = Math.floor(r / 1000)
  r = r % 1000

  const parts: string[] = []
  if (crore > 0) parts.push(toWordsUpTo999(crore) + ' Crore')
  if (lakh > 0) parts.push(toWordsUpTo99(lakh) + ' Lakh')
  if (thousand > 0) parts.push(toWordsUpTo999(thousand) + ' Thousand')
  if (r > 0) parts.push(toWordsUpTo999(r))

  const str = parts.join(' ').trim()
  return str ? str + ' Only' : 'Zero Only'
}

/** Build attendance summary for payroll: total days, full days, half days, unpaid leaves, payable days. */
export function buildAttendanceSummary(
  totalDaysInMonth: number,
  unpaidLeaves: number,
  halfDays: number,
  fullDays?: number
): AttendanceSummaryForPayroll {
  const payableDays = calculatePayableDays(totalDaysInMonth, unpaidLeaves, halfDays)
  return {
    totalDaysInMonth,
    fullDays: fullDays ?? totalDaysInMonth - unpaidLeaves - halfDays,
    halfDays,
    unpaidLeaves,
    payableDays,
  }
}
