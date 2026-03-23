/**
 * Seed HospitalMaster, DoctorMaster, TPAMaster, AnesthesiaMaster from app/bd-insurance-dropdowns.txt
 * Run: npx tsx prisma/seed-masters.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function parseDropdownFile(raw: string) {
  const lines = raw.split(/\r?\n/)

  const surgeonIdx = lines.findIndex((l) => l.trim() === 'Surgeon names:')
  const generalIdx = lines.findIndex((l) => l.trim().toLowerCase().startsWith('general anesthesia'))

  const doctors: string[] = []
  if (surgeonIdx >= 0 && generalIdx > surgeonIdx) {
    for (let i = surgeonIdx + 1; i < generalIdx; i++) {
      const t = lines[i].trim()
      if (t.startsWith('Dr ') || t.startsWith('Dr.')) doctors.push(t)
    }
  }

  const anesthesia: string[] = []
  if (generalIdx >= 0) {
    for (let i = generalIdx; i < lines.length; i++) {
      const t = lines[i].trim()
      if (!t) continue
      if (t.startsWith('-')) break
      if (t.toLowerCase().includes('anesthesia')) anesthesia.push(t)
    }
  }

  const hospitals: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('- ')) {
      hospitals.push(t.replace(/^\-\s*/, '').trim())
    }
  }

  const tpaCandidates: string[] = []
  const endTpa = surgeonIdx >= 0 ? surgeonIdx : lines.length
  for (let i = 0; i < endTpa; i++) {
    const t = lines[i].trim()
    if (!t || t === 'CompanyName') continue
    tpaCandidates.push(t)
  }

  const uniq = (arr: string[]) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))]

  return {
    doctors: uniq(doctors),
    anesthesia: uniq(anesthesia),
    hospitals: uniq(hospitals),
    tpas: uniq(tpaCandidates),
  }
}

async function main() {
  const filePath = join(process.cwd(), 'app', 'bd-insurance-dropdowns.txt')
  const raw = readFileSync(filePath, 'utf-8')
  const { doctors, anesthesia, hospitals, tpas } = parseDropdownFile(raw)

  console.log(
    `Parsed: ${doctors.length} doctors, ${anesthesia.length} anesthesia, ${hospitals.length} hospitals, ${tpas.length} TPAs`
  )

  for (const name of hospitals) {
    await prisma.hospitalMaster.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  for (const name of doctors) {
    await prisma.doctorMaster.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  for (const name of anesthesia) {
    await prisma.anesthesiaMaster.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  for (const name of tpas) {
    await prisma.tPAMaster.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  console.log('✅ Master data seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
