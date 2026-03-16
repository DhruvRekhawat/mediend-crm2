/**
 * Backfill leadDate for existing leads.
 * Sets leadDate = createdDate for leads where leadDate is null.
 * After this, the MySQL sync will populate leadDate from Lead_Date for leads it updates.
 *
 * Run after migrating to add leadDate column. Requires DATABASE_URL in .env.
 * Usage: tsx scripts/backfill-lead-date.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'

const BATCH_SIZE = 5000

async function backfillLeadDate() {
  const startTime = Date.now()
  console.log('\n' + '='.repeat(60))
  console.log('Backfilling leadDate from createdDate')
  console.log('='.repeat(60))

  try {
    // Prisma updateMany doesn't support setting a column from another column - use raw SQL
    const result = await prisma.$executeRaw`
      UPDATE "Lead"
      SET "leadDate" = "createdDate"
      WHERE "leadDate" IS NULL
    `
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nUpdated ${result} leads with leadDate = createdDate in ${elapsed}s`)
    console.log('='.repeat(60) + '\n')
  } catch (error) {
    console.error('Backfill failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

backfillLeadDate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
