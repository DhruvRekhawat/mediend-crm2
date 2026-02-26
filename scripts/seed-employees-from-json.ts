/**
 * Seed Users and Employees from csvjson(5).json (or similar JSON).
 * Reset: points all User/Employee FKs to a placeholder, deletes employees/teams/non-placeholder users, then seeds fresh (employeeCode = EMP ID, password 12345678).
 *
 * Local: npx tsx scripts/seed-employees-from-json.ts [path/to/csvjson(5).json]
 * Docker: docker compose --profile tools run --rm -v "$(pwd)/csvjson(5).json:/app/csvjson(5).json" seed
 *         (mount your JSON at /app/csvjson(5).json or pass path: seed /app/other.json)
 */

import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const { Pool } = pkg

const DEFAULT_PASSWORD = '12345678'
const PLACEHOLDER_EMAIL = 'seed-placeholder@mediend.local'
const BD_MAP_PATH = path.join(process.cwd(), 'lib', 'sync', 'bd-number-to-user-id.json')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: [],
})

interface JsonRow {
  'EMP ID': number
  BDM: string
  DEPT: string
  'Phone Number': number | string
  Email: string
  Team: string
  'BD number': number | string
  'Manager Number': number | string
  role: string
}

const ROLE_MAP: Record<string, UserRole> = {
  'MD/ADMIN': 'MD',
  MD: 'MD',
  ADMIN: 'ADMIN',
  EXECUTIVE_ASSISTANT: 'EXECUTIVE_ASSISTANT',
  SALES_HEAD: 'SALES_HEAD',
  CATEGORY_MANAGER: 'CATEGORY_MANAGER',
  ASSISTANT_CATEGORY_MANAGER: 'ASSISTANT_CATEGORY_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  BD: 'BD',
  INSURANCE_HEAD: 'INSURANCE_HEAD',
  PL_HEAD: 'PL_HEAD',
  OUTSTANDING_HEAD: 'OUTSTANDING_HEAD',
  HR_HEAD: 'HR_HEAD',
  FINANCE_HEAD: 'FINANCE_HEAD',
  DIGITAL_HEAD: 'DIGITAL_MARKETING_HEAD',
  DIGITAL_MARKETING_HEAD: 'DIGITAL_MARKETING_HEAD',
  USER: 'USER',
  TESTER: 'TESTER',
}

function mapRole(role: string): UserRole {
  const r = (role || '').trim()
  return ROLE_MAP[r] ?? 'USER'
}

/** MD's employee code in the JSON (EMP ID 1000). Only this value is treated as "manager = MD". */
const MD_EMP_ID = 1000

function parseManagerNumber(val: number | string | undefined): number | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  if (s === '') return null
  // Only literal 1000 or string "1000" means MD (employeeCode 1000); "1000 (MD)" / "1000 MD" = no manager
  if (val === 1000 || s === '1000') return MD_EMP_ID
  const n = typeof val === 'number' ? val : parseInt(s, 10)
  if (isNaN(n)) return null
  if (n === MD_EMP_ID) return null // other variants of 1000 (e.g. "1000 (MD)") → no manager
  return n
}

function bdNumberValue(row: JsonRow): number | null {
  const v = row['BD number']
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10)
  return isNaN(n) ? null : n
}

async function main() {
  const inputPath = process.argv[2] || path.join(process.cwd(), 'csvjson(5).json')
  console.log('Reading', inputPath)

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    process.exit(1)
  }

  let rows: JsonRow[]
  try {
    const raw = fs.readFileSync(inputPath, 'utf-8')
    rows = JSON.parse(raw) as JsonRow[]
  } catch (e) {
    console.error('Failed to parse JSON:', e)
    process.exit(1)
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('JSON must be a non-empty array of rows')
    process.exit(1)
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    const code = (err as { code?: string })?.code
    const msg = err instanceof Error ? err.message : String(err)
    if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED') || msg.toLowerCase().includes('connect')) {
      console.error('Cannot connect to the database. Check DATABASE_URL and network.')
      process.exit(1)
    }
    throw err
  }

  const withEmail = rows.filter((r) => {
    const e = (r.Email ?? '').toString().trim()
    return e.length > 0
  })
  const skipped = rows.length - withEmail.length
  if (skipped > 0) console.log(`Skipped ${skipped} row(s) with no email.`)

  // --- Reset: point all User FKs to placeholder, then delete employees/teams/users (except placeholder) ---
  console.log('Reset: creating placeholder and clearing users/employees/teams...')
  const placeholderHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  const placeholder = await prisma.user.upsert({
    where: { email: PLACEHOLDER_EMAIL },
    create: {
      email: PLACEHOLDER_EMAIL,
      passwordHash: placeholderHash,
      name: 'Seed Placeholder',
      role: 'ADMIN',
    },
    update: {},
  })
  const pid = placeholder.id

  // Point every required User FK to placeholder so we can delete other users
  await prisma.lead.updateMany({ data: { bdId: pid, createdById: pid, updatedById: pid } })
  await prisma.leadStageEvent.updateMany({ data: { changedById: pid } })
  await prisma.target.updateMany({ data: { createdById: pid } })
  await prisma.ledgerEntry.updateMany({ data: { createdById: pid } })
  await prisma.ledgerAuditLog.updateMany({ data: { performedById: pid } })
  await prisma.salesEntry.updateMany({ data: { createdById: pid } })
  await prisma.stockMovement.updateMany({ data: { createdById: pid } })
  await prisma.purchaseTransaction.updateMany({ data: { createdById: pid } })
  await prisma.issueTransaction.updateMany({ data: { issuedToId: pid, createdById: pid } })
  await prisma.kYPSubmission.updateMany({ data: { submittedById: pid } })
  await prisma.preAuthPDF.updateMany({ data: { createdById: pid } })
  await prisma.insuranceQuery.updateMany({ data: { raisedById: pid } })
  await prisma.admissionRecord.updateMany({ data: { initiatedById: pid } })
  await prisma.insuranceInitiateForm.updateMany({ data: { createdById: pid } })
  await prisma.caseStageHistory.updateMany({ data: { changedById: pid } })
  await prisma.dischargeSheet.updateMany({ data: { createdById: pid } })
  await prisma.task.updateMany({ data: { assigneeId: pid, createdById: pid } })
  await prisma.taskDueDateApproval.updateMany({ data: { requestedById: pid } })
  await prisma.mDTaskTeam.updateMany({ data: { ownerId: pid } })
  await prisma.workLog.updateMany({ data: { employeeId: pid } }) // employeeId references User
  await prisma.notification.updateMany({ data: { userId: pid } })

  // Optional User FKs: set to null so no row points at a user we are about to delete
  await prisma.ledgerEntry.updateMany({
    data: { deletedById: null, editRequestedById: null, editApprovedById: null, approvedById: null },
  })
  await prisma.insuranceCase.updateMany({ data: { handledById: null } })
  await prisma.leadRemark.updateMany({ data: { handledById: null } })
  await prisma.preAuthPDF.updateMany({ data: { handledById: null } })
  await prisma.insuranceQuery.updateMany({ data: { answeredById: null } })
  await prisma.outstandingCase.updateMany({ data: { handledById: null } })
  await prisma.department.updateMany({ data: { headId: null } })
  await prisma.caseChatMessage.updateMany({ data: { senderId: null } })
  await prisma.preAuthorization.updateMany({ data: { preAuthRaisedById: null } })

  await prisma.user.updateMany({ data: { teamId: null } })
  await prisma.departmentTeam.updateMany({ data: { teamLeadId: null } })
  await prisma.employee.updateMany({ data: { managerId: null, teamId: null } })

  // Delete in dependency order: child tables first, then Employee, Team, then Users except placeholder
  await prisma.mDWatchlistEmployee.deleteMany()
  await prisma.mDTaskTeamMember.deleteMany()
  await prisma.taskDueDateApproval.deleteMany()
  await prisma.task.deleteMany()
  await prisma.mDTaskTeam.deleteMany()
  await prisma.workLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.leaveBalance.deleteMany()
  await prisma.attendanceLog.deleteMany()
  await prisma.payrollComponent.deleteMany()
  await prisma.payrollRecord.deleteMany()
  await prisma.employeeDocument.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.mDAppointment.deleteMany()
  await prisma.mentalHealthRequest.deleteMany()
  await prisma.supportTicket.deleteMany()
  await prisma.incrementRequest.deleteMany()
  await prisma.iJPApplication.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany({ where: { id: { not: pid } } })
  console.log('Reset: done.')

  const empIdToEmployeeId = new Map<number, string>()
  const bdNumberToUserId = new Map<number, string>()
  let mdUserId: string | null = null
  let firstUserId: string | null = null
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  // Pass 1: Create User and Employee (clean slate; employeeCode = EMP ID)
  for (const row of withEmail) {
    const email = (row.Email as string).toString().trim().toLowerCase()
    const name = (row.BDM ?? '').toString().trim() || email
    const role = mapRole(row.role)
    const empId = row['EMP ID']
    const employeeCode = String(empId)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        name,
        role,
      },
    })

    const employee = await prisma.employee.create({
      data: { userId: user.id, employeeCode },
    })

    empIdToEmployeeId.set(empId, employee.id)
    if (!firstUserId) firstUserId = user.id
    const bdNum = bdNumberValue(row)
    if (bdNum !== null) {
      const existing = bdNumberToUserId.get(bdNum)
      if (existing !== undefined && existing !== user.id) {
        console.warn(
          `  BD number ${bdNum} already mapped to another user; keeping first (row: ${row.BDM}, emp ${empId})`
        )
      } else if (existing === undefined) {
        bdNumberToUserId.set(bdNum, user.id)
      }
    }
    if (empId === MD_EMP_ID) mdUserId = user.id
  }

  console.log(`Pass 1: ${withEmail.length} user(s) / employee(s) upserted.`)
  console.log(`BD number map entries: ${bdNumberToUserId.size}`)

  // Pass 2: Set managerId
  let managerUpdates = 0
  for (const row of withEmail) {
    const empId = row['EMP ID']
    const employeeId = empIdToEmployeeId.get(empId)
    if (!employeeId) continue

    const managerEmpId = parseManagerNumber(row['Manager Number'])
    const managerEmployeeId =
      managerEmpId === null ? null : empIdToEmployeeId.get(managerEmpId) ?? null
    if (managerEmpId !== null && !managerEmployeeId) {
      console.warn(`  Manager EMP ID ${managerEmpId} not found for employee ${empId}, leaving managerId null`)
    }

    const current = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    })
    if (current?.managerId !== managerEmployeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { managerId: managerEmployeeId },
      })
      managerUpdates++
    }
  }
  console.log(`Pass 2: ${managerUpdates} employee(s) managerId updated.`)

  // Add direct reports of MD (managerId = MD's Employee id) to MD watchlist
  const mdEmployeeId = empIdToEmployeeId.get(MD_EMP_ID)
  if (mdUserId && mdEmployeeId) {
    const directReports = await prisma.employee.findMany({
      where: { managerId: mdEmployeeId },
      select: { id: true },
    })
    if (directReports.length > 0) {
      await prisma.mDWatchlistEmployee.createMany({
        data: directReports.map((e) => ({ ownerId: mdUserId!, employeeId: e.id })),
        skipDuplicates: true,
      })
      console.log(`MD watchlist: ${directReports.length} direct report(s) added.`)
    }
  }

  // Optional: resolve DEPT to departmentId (by name)
  const departments = await prisma.department.findMany({ select: { id: true, name: true } })
  const deptByName = new Map(departments.map((d) => [d.name.toUpperCase(), d.id]))
  let deptUpdates = 0
  for (const row of withEmail) {
    const empId = row['EMP ID']
    const employeeId = empIdToEmployeeId.get(empId)
    if (!employeeId) continue
    const deptName = (row.DEPT ?? '').toString().trim()
    const deptId = deptName ? deptByName.get(deptName.toUpperCase()) ?? null : null
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } })
    if (deptId && emp?.departmentId !== deptId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { departmentId: deptId },
      })
      deptUpdates++
    }
  }
  if (deptUpdates > 0) console.log(`Department: ${deptUpdates} employee(s) departmentId set.`)

  // Lead fix by name: set bdId where bdeName matches BDM name
  let leadUpdates = 0
  for (const row of withEmail) {
    const email = (row.Email as string).toString().trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) continue
    const name = (row.BDM ?? '').toString().trim()
    if (!name) continue

    const result = await prisma.lead.updateMany({
      where: {
        bdeName: { equals: name, mode: 'insensitive' },
        bdId: { not: user.id },
      },
      data: { bdId: user.id },
    })
    leadUpdates += result.count
  }
  console.log(`Lead fix by name: ${leadUpdates} lead(s) bdId updated.`)

  // Write BD number -> User id map for MySQL sync
  const dir = path.dirname(BD_MAP_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const obj: Record<string, string> = {}
  bdNumberToUserId.forEach((userId, bdNum) => {
    obj[String(bdNum)] = userId
  })
  fs.writeFileSync(BD_MAP_PATH, JSON.stringify(obj, null, 2), 'utf-8')
  console.log(`Wrote BD number map to ${BD_MAP_PATH}.`)

  // Reassign all rows that still point at placeholder to a real user, then remove placeholder
  const fallbackUserId = mdUserId ?? firstUserId
  if (fallbackUserId) {
    await prisma.lead.updateMany({ where: { bdId: pid }, data: { bdId: fallbackUserId } })
    await prisma.lead.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.lead.updateMany({ where: { updatedById: pid }, data: { updatedById: fallbackUserId } })
    await prisma.leadStageEvent.updateMany({ where: { changedById: pid }, data: { changedById: fallbackUserId } })
    await prisma.target.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.ledgerEntry.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.ledgerAuditLog.updateMany({ where: { performedById: pid }, data: { performedById: fallbackUserId } })
    await prisma.salesEntry.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.stockMovement.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.purchaseTransaction.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.issueTransaction.updateMany({ where: { issuedToId: pid }, data: { issuedToId: fallbackUserId } })
    await prisma.issueTransaction.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.kYPSubmission.updateMany({ where: { submittedById: pid }, data: { submittedById: fallbackUserId } })
    await prisma.preAuthPDF.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.insuranceQuery.updateMany({ where: { raisedById: pid }, data: { raisedById: fallbackUserId } })
    await prisma.admissionRecord.updateMany({ where: { initiatedById: pid }, data: { initiatedById: fallbackUserId } })
    await prisma.insuranceInitiateForm.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
    await prisma.caseStageHistory.updateMany({ where: { changedById: pid }, data: { changedById: fallbackUserId } })
    await prisma.dischargeSheet.updateMany({ where: { createdById: pid }, data: { createdById: fallbackUserId } })
  }
  await prisma.user.delete({ where: { id: pid } })
  console.log('Placeholder user removed.')

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
