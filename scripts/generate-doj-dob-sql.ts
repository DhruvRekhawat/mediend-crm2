/**
 * Reads prisma/doj-dob.json and generates SQL to update Employee.joinDate and Employee.dateOfBirth
 * by employee_code. Run: bun run scripts/generate-doj-dob-sql.ts
 * Then run the output: psql ... -f prisma/doj-dob-updates.sql
 */

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

interface DojDobRow {
  employee_code: string
  name: string
  department: string
  joining_date: string
  date_of_birth: string
}

function parseJoiningDate(s: string): string | null {
  if (!s?.trim()) return null
  // DD-MM-YYYY
  const m1 = s.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m1) {
    const [, d, m, y] = m1
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return null
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
}

function parseDateOfBirth(s: string): string | null {
  if (!s?.trim()) return null
  const t = s.trim()
  // "Thursday,June 10,1999" or "Saturday,November 15,2003"
  const m1 = t.match(/^[A-Za-z]+,?\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (m1) {
    const month = MONTHS[m1[1].toLowerCase()]
    if (month) return `${m1[3]}-${month}-${m1[2].padStart(2, "0")}`
  }
  // "18 May 2004" or "18 January 2003"
  const m2 = t.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m2) {
    const month = MONTHS[m2[2].toLowerCase()]
    if (month) return `${m2[3]}-${month}-${m2[1].padStart(2, "0")}`
  }
  // "31 August 1992" (same as above, m2 handles it)
  return null
}

function main() {
  const jsonPath = join(process.cwd(), "prisma", "doj-dob.json")
  const outPath = join(process.cwd(), "prisma", "doj-dob-updates.sql")

  const data = JSON.parse(readFileSync(jsonPath, "utf-8")) as DojDobRow[]

  const seen = new Set<string>()
  const updates: string[] = []

  for (const row of data) {
    const code = row.employee_code?.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)

    const joinDate = parseJoiningDate(row.joining_date)
    const dob = parseDateOfBirth(row.date_of_birth)

    if (!joinDate && !dob) continue

    const parts: string[] = []
    if (joinDate) parts.push(`"joinDate" = '${joinDate}'::date`)
    if (dob) parts.push(`"dateOfBirth" = '${dob}'::date`)

    if (parts.length === 0) continue

    updates.push(
      `UPDATE "Employee" SET ${parts.join(", ")} WHERE "employeeCode" = '${code.replace(/'/g, "''")}';`
    )
  }

  const sql = `-- Generated from prisma/doj-dob.json by scripts/generate-doj-dob-sql.ts
-- Run: psql $DATABASE_URL -f prisma/doj-dob-updates.sql
-- Or: docker compose exec postgres psql -U postgres -d mediend_crm -f - < prisma/doj-dob-updates.sql

BEGIN;

${updates.join("\n")}

COMMIT;
`

  writeFileSync(outPath, sql)
  console.log(`Wrote ${updates.length} UPDATE statements to ${outPath}`)
}

main()
