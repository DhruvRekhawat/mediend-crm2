/**
 * Seed holidays from app/holidays.json into the Holiday table.
 * Run: npx tsx scripts/seed-holidays.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

interface HolidayJson {
  slNo: number
  date: string
  day: string
  holiday: string
  type: string
}

interface HolidaysFile {
  year: number
  holidays: HolidayJson[]
}

async function main() {
  const jsonPath = join(process.cwd(), 'app', 'holidays.json')
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as HolidaysFile

  let created = 0
  let updated = 0

  for (const h of data.holidays) {
    const date = new Date(h.date)
    if (isNaN(date.getTime())) {
      console.warn(`Skipping invalid date: ${h.date}`)
      continue
    }

    const existing = await prisma.holiday.findUnique({
      where: { date },
    })

    if (existing) {
      await prisma.holiday.update({
        where: { date },
        data: { name: h.holiday, type: h.type },
      })
      updated++
    } else {
      await prisma.holiday.create({
        data: {
          date,
          name: h.holiday,
          type: h.type,
        },
      })
      created++
    }
  }

  console.log(`Holidays seeded: ${created} created, ${updated} updated`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
