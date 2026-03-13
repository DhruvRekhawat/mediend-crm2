import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type CarryForwardRow = {
  BDM: string
  DEPT: string
  CL: number
  SL: number
  EL: number
  'MONTH_feb-2026'?: string
}

type ProbationRow = {
  EMP_ID: number
  BDM: string
  DEPT: string
}

type LeavesJson = {
  CARRY_FORRWARD_AFTER_ADJ_IN_FEB: CarryForwardRow[]
  PROBATION_LEAVES: ProbationRow[]
  PRO_DATA?: ProbationRow[]
}

type EmployeeLeaveBalanceRow = {
  EMP_ID: number
  BDM: string
  DEPT: string
  BALANCE_CL: number
  BALANCE_SL: number
  BALANCE_EL: number
}

type EmployeeLeaveBalancesJson = {
  employee_leave_balances: EmployeeLeaveBalanceRow[]
}

type BalanceCode = 'CL' | 'SL' | 'EL'

function normalizeName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function buildNameKeys(value: string): string[] {
  const raw = String(value).trim().toUpperCase()
  const normalized = normalizeName(raw)
  const keys = new Set<string>([normalized])

  const dottedInitialMatch = raw.match(/^[A-Z]\.(.+)$/)
  if (dottedInitialMatch) {
    keys.add(normalizeName(dottedInitialMatch[1]))
  }

  return [...keys]
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function buildBalanceSql(employeeCode: string, leaveCode: BalanceCode, balance: number): string {
  const importId = `import-${employeeCode}-${leaveCode}`
  return [
    'INSERT INTO "LeaveBalance" (',
    '  id,',
    '  "employeeId",',
    '  "leaveTypeId",',
    '  allocated,',
    '  used,',
    '  remaining,',
    '  "createdAt",',
    '  "updatedAt"',
    ')',
    'SELECT',
    `  ${sqlString(importId)},`,
    '  e.id,',
    '  lt.id,',
    `  ${balance.toFixed(1)}::double precision,`,
    '  0::double precision,',
    `  ${balance.toFixed(1)}::double precision,`,
    '  NOW(),',
    '  NOW()',
    'FROM "Employee" e',
    'JOIN "LeaveTypeMaster" lt',
    `  ON (lt.code = ${sqlString(leaveCode)} OR lt.name = ${sqlString(leaveCode)})`,
    `WHERE e."employeeCode" = ${sqlString(employeeCode)}`,
    'ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE',
    'SET',
    '  allocated = EXCLUDED.allocated,',
    '  used = EXCLUDED.used,',
    '  remaining = EXCLUDED.remaining,',
    '  "updatedAt" = NOW();',
  ].join('\n')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const workspaceRoot = process.cwd()
  const correctedJsonPath = path.join(workspaceRoot, 'prisma', 'employee-leave-balances.json')
  const legacyJsonPath = path.join(workspaceRoot, 'prisma', 'leaves.json')
  const outputPath = path.join(workspaceRoot, 'prisma', 'leave-balance-updates.sql')
  const unmatched: string[] = []
  const ambiguous: string[] = []
  const statements: string[] = []
  let sourceLabel = 'prisma/leaves.json'

  if (await fileExists(correctedJsonPath)) {
    const raw = await readFile(correctedJsonPath, 'utf8')
    const data = JSON.parse(raw) as EmployeeLeaveBalancesJson
    sourceLabel = 'prisma/employee-leave-balances.json'

    for (const row of data.employee_leave_balances ?? []) {
      const employeeCode = String(row.EMP_ID).trim()
      if (!employeeCode) {
        unmatched.push(`${row.BDM} [${row.DEPT}]`)
        continue
      }

      statements.push(`-- ${row.BDM} [${employeeCode}]`)
      statements.push(buildBalanceSql(employeeCode, 'CL', Number(row.BALANCE_CL) || 0))
      statements.push(buildBalanceSql(employeeCode, 'SL', Number(row.BALANCE_SL) || 0))
      statements.push(buildBalanceSql(employeeCode, 'EL', Number(row.BALANCE_EL) || 0))
      statements.push('')
    }
  } else {
    const raw = await readFile(legacyJsonPath, 'utf8')
    const data = JSON.parse(raw) as LeavesJson

    const idLookupRows = [...(data.PROBATION_LEAVES ?? []), ...(data.PRO_DATA ?? [])]
    const probationByName = new Map<string, ProbationRow[]>()

    for (const row of idLookupRows) {
      for (const key of buildNameKeys(row.BDM)) {
        const list = probationByName.get(key) ?? []
        list.push(row)
        probationByName.set(key, list)
      }
    }

    for (const row of data.CARRY_FORRWARD_AFTER_ADJ_IN_FEB) {
      const keyMatches = buildNameKeys(row.BDM).flatMap((key) => probationByName.get(key) ?? [])
      let matches = Array.from(new Map(keyMatches.map((match) => [String(match.EMP_ID), match])).values())

      if (matches.length !== 1) {
        const deptMatches = matches.filter(
          (item) => item.DEPT.trim().toUpperCase() === row.DEPT.trim().toUpperCase()
        )
        if (deptMatches.length > 0) {
          matches = deptMatches
        }
      }

      if (matches.length === 0) {
        unmatched.push(`${row.BDM} [${row.DEPT}]`)
        continue
      }

      if (matches.length > 1) {
        ambiguous.push(`${row.BDM} [${row.DEPT}] -> ${matches.map((m) => m.EMP_ID).join(', ')}`)
        continue
      }

      const employeeCode = String(matches[0].EMP_ID)
      statements.push(`-- ${row.BDM} [${employeeCode}]`)
      statements.push(buildBalanceSql(employeeCode, 'CL', Number(row.CL) || 0))
      statements.push(buildBalanceSql(employeeCode, 'SL', Number(row.SL) || 0))
      statements.push(buildBalanceSql(employeeCode, 'EL', Number(row.EL) || 0))
      statements.push('')
    }
  }

  const header = [
    `-- Generated from ${sourceLabel}`,
    '-- Current balance import up to Feb 2026',
    '-- This sets allocated = remaining = imported balance, and used = 0',
    '-- March and later accruals are added by the app leave calculator.',
    '-- Review before running.',
    '',
    'BEGIN;',
    '',
  ]

  const footer = [
    'COMMIT;',
    '',
    `-- Matched rows: ${statements.filter((line) => line.startsWith('-- ')).length}`,
    `-- Unmatched rows: ${unmatched.length}`,
    `-- Ambiguous rows: ${ambiguous.length}`,
  ]

  const diagnostics: string[] = []
  if (unmatched.length > 0) {
    diagnostics.push('', '-- Unmatched names')
    diagnostics.push(...unmatched.map((value) => `-- ${value}`))
  }
  if (ambiguous.length > 0) {
    diagnostics.push('', '-- Ambiguous names')
    diagnostics.push(...ambiguous.map((value) => `-- ${value}`))
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, [...header, ...statements, ...footer, ...diagnostics, ''].join('\n'), 'utf8')

  console.log(`Wrote ${outputPath}`)
  console.log(`Matched: ${statements.filter((line) => line.startsWith('-- ')).length}`)
  if (unmatched.length > 0) {
    console.log(`Unmatched: ${unmatched.length}`)
  }
  if (ambiguous.length > 0) {
    console.log(`Ambiguous: ${ambiguous.length}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
