/**
 * Backfill conversionDate for IPD Done leads that have no surgery/admission date.
 * Sets conversionDate = updatedDate for COMPLETED leads where surgeryDate and
 * ipdAdmissionDate are null but updatedDate exists and is after leadDate.
 * This fixes leads that were marked IPD Done in a later month than when received.
 *
 * Run after the mapper fix. Requires DATABASE_URL in .env.
 * Usage: bun run scripts/backfill-conversion-dates.ts
 * Docker: docker compose --profile tools run --rm backfill-conversion-dates
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function backfillConversionDates() {
  const startTime = Date.now()
  console.log('\n' + '='.repeat(60))
  console.log('Backfilling conversionDate from updatedDate for IPD Done leads')
  console.log('='.repeat(60))

  try {
    const result = await prisma.$executeRaw`
      UPDATE "Lead"
      SET "conversionDate" = "updatedDate"
      WHERE "pipelineStage" = 'COMPLETED'
        AND "surgeryDate" IS NULL
        AND "ipdAdmissionDate" IS NULL
        AND "updatedDate" IS NOT NULL
        AND "updatedDate" > "leadDate"
    `
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nUpdated ${result} leads with conversionDate = updatedDate in ${elapsed}s`)
    console.log('='.repeat(60) + '\n')
  } catch (error) {
    console.error('Backfill failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

backfillConversionDates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
