import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, unauthorizedResponse } from '@/lib/api-utils'

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value).trim()
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatDateDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, 'finance:payroll:read')) return errorResponse('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const transactionDateParam = searchParams.get('transactionDate')

    if (!idsParam?.trim()) {
      return errorResponse('ids (payroll IDs) are required', 400)
    }

    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean)
    if (ids.length === 0) return errorResponse('At least one payroll id is required', 400)

    let transactionDate: Date
    if (transactionDateParam?.trim()) {
      const s = transactionDateParam.trim()
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
      const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
      if (isoMatch) {
        transactionDate = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      } else if (dmyMatch) {
        const [, day, month, year] = dmyMatch
        transactionDate = new Date(Number(year), Number(month) - 1, Number(day))
      } else {
        const parsed = new Date(s)
        if (Number.isNaN(parsed.getTime())) return errorResponse('Invalid transactionDate. Use DD/MM/YYYY or YYYY-MM-DD', 400)
        transactionDate = parsed
      }
      if (Number.isNaN(transactionDate.getTime())) return errorResponse('Invalid transactionDate', 400)
    } else {
      transactionDate = new Date()
    }
    const transactionDateStr = formatDateDDMMYYYY(transactionDate)

    const records = await prisma.monthlyPayroll.findMany({
      where: { id: { in: ids } },
      include: {
        employee: {
          select: {
            id: true,
            bankAccountNumber: true,
            ifscCode: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    })
    records.sort((a, b) => (a.employee?.user?.name ?? '').localeCompare(b.employee?.user?.name ?? ''))

    const headerRow = [
      'Beneficiary Name',
      'Beneficiary Account Number',
      'IFSC',
      'Transaction Type',
      'Debit Account Number',
      'Transaction Date',
      'Amount',
      'Currency',
      'Beneficiary Email',
    ].map(escapeCsvCell).join(',')

    const rows: string[] = [headerRow]

    for (const p of records) {
      const emp = p.employee
      const bankAccount = emp?.bankAccountNumber?.trim()
      if (!bankAccount) continue
      const beneficiaryName = emp?.user?.name ?? '' // Employee name
      const amount = Math.round(p.netPayable ?? 0)
      const ifsc = (emp as { ifscCode?: string | null }).ifscCode?.trim() ?? ''
      const row = [
        escapeCsvCell(beneficiaryName),
        escapeCsvCell(bankAccount),
        escapeCsvCell(ifsc),
        'NEFT', // Transaction type: always NEFT
        '', // Debit Account Number - company account, user fills in bank
        transactionDateStr,
        amount,
        'INR', // Currency: always INR
        escapeCsvCell(emp?.user?.email ?? ''),
      ].join(',')
      rows.push(row)
    }

    const csv = rows.join('\r\n')
    const filename = `payroll-bank-export-${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting payroll CSV:', error)
    return errorResponse('Failed to export CSV', 500)
  }
}
