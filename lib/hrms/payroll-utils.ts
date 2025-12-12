import { PayrollRecord, PayrollComponent, PayrollComponentType } from '@prisma/client'

export interface PayrollRecordWithComponents extends PayrollRecord {
  components: PayrollComponent[]
}

export interface PayrollCalculation {
  basicSalary: number
  allowances: number
  deductions: number
  grossSalary: number
  netSalary: number
}

export function calculatePayroll(
  basicSalary: number,
  components: Array<{ componentType: PayrollComponentType; amount: number }>
): PayrollCalculation {
  let allowances = 0
  let deductions = 0

  for (const component of components) {
    if (component.componentType === PayrollComponentType.ALLOWANCE) {
      allowances += component.amount
    } else {
      deductions += component.amount
    }
  }

  const grossSalary = basicSalary + allowances
  const netSalary = grossSalary - deductions

  return {
    basicSalary,
    allowances,
    deductions,
    grossSalary,
    netSalary,
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return months[month - 1] || ''
}

