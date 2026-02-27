import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!hasPermission(user, 'hrms:employees:write') && !hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const contentType = request.headers.get('content-type') || ''
    let text: string
    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      text = await request.text()
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return errorResponse('No file uploaded', 400)
      }
      text = await file.text()
    } else {
      const body = await request.json()
      if (typeof body.csv === 'string') {
        text = body.csv
      } else if (typeof body.content === 'string') {
        text = body.content
      } else {
        return errorResponse('Provide CSV as file upload or csv/content string', 400)
      }
    }

    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      return errorResponse('CSV must have header and at least one row', 400)
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const employeeCodeIdx = header.findIndex((h) => h === 'employeecode' || h === 'employee_code' || h === 'code')
    const leaveTypeIdx = header.findIndex((h) => h === 'leavetype' || h === 'leave_type' || h === 'type')
    const allocatedIdx = header.findIndex((h) => h === 'allocated')
    const usedIdx = header.findIndex((h) => h === 'used')
    const remainingIdx = header.findIndex((h) => h === 'remaining')

    if (employeeCodeIdx < 0 || leaveTypeIdx < 0) {
      return errorResponse('CSV must have employeeCode (or code) and leaveType (or type) columns', 400)
    }

    const leaveTypes = await prisma.leaveTypeMaster.findMany({ where: { isActive: true } })
    const leaveTypeByName = new Map(leaveTypes.map((lt) => [lt.name.toLowerCase().trim(), lt]))
    const employees = await prisma.employee.findMany({ select: { id: true, employeeCode: true } })
    const employeeByCode = new Map(employees.map((e) => [e.employeeCode.trim().toUpperCase(), e]))

    let updated = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim())
      const empCode = (row[employeeCodeIdx] ?? '').trim().toUpperCase()
      const typeName = (row[leaveTypeIdx] ?? '').trim()
      const allocated = allocatedIdx >= 0 ? parseFloat(row[allocatedIdx] ?? '0') : undefined
      const used = usedIdx >= 0 ? parseFloat(row[usedIdx] ?? '0') : undefined
      const remaining = remainingIdx >= 0 ? parseFloat(row[remainingIdx] ?? '0') : undefined

      if (!empCode || !typeName) continue

      const employee = employeeByCode.get(empCode)
      const leaveType = leaveTypeByName.get(typeName.toLowerCase())
      if (!employee) {
        errors.push(`Row ${i + 1}: Employee code "${empCode}" not found`)
        continue
      }
      if (!leaveType) {
        errors.push(`Row ${i + 1}: Leave type "${typeName}" not found`)
        continue
      }

      const existing = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: { employeeId: employee.id, leaveTypeId: leaveType.id },
        },
      })

      const data: { allocated?: number; used?: number; remaining?: number } = {}
      if (allocated !== undefined && !isNaN(allocated)) data.allocated = allocated
      if (used !== undefined && !isNaN(used)) data.used = used
      if (remaining !== undefined && !isNaN(remaining)) data.remaining = remaining

      if (existing) {
        await prisma.leaveBalance.update({
          where: {
            employeeId_leaveTypeId: { employeeId: employee.id, leaveTypeId: leaveType.id },
          },
          data,
        })
        updated++
      } else {
        const alloc = data.allocated ?? leaveType.maxDays
        const usedVal = data.used ?? 0
        const rem = data.remaining ?? (alloc - usedVal)
        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            allocated: alloc,
            used: usedVal,
            remaining: Math.max(0, rem),
          },
        })
        updated++
      }
    }

    return successResponse({
      updated,
      errors: errors.length > 0 ? errors : undefined,
    }, `Updated ${updated} leave balance record(s)`)
  } catch (error) {
    console.error('Error bulk updating leave balances:', error)
    return errorResponse('Failed to bulk update leave balances', 500)
  }
}
