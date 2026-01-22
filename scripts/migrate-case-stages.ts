/**
 * Migration script to set caseStage for existing leads based on their current state
 * Run this after running Prisma migrations.
 * Ensure PostgreSQL is running and DATABASE_URL is set (e.g. in .env).
 *
 * Usage: npm run migrate:case-stages
 *    or: bun run migrate:case-stages
 *    or: tsx scripts/migrate-case-stages.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { CaseStage } from '@prisma/client'

async function migrateCaseStages() {
  console.log('Starting case stage migration...')

  try {
    // Get all leads
    const leads = await prisma.lead.findMany({
      include: {
        kypSubmission: {
          include: {
            preAuthData: true,
          },
        },
        admissionRecord: true,
        dischargeSheet: true,
      },
    })

    console.log(`Found ${leads.length} leads to migrate`)

    let migrated = 0
    let skipped = 0

    for (const lead of leads) {
      let newStage: CaseStage = CaseStage.NEW_LEAD

      // Determine stage based on current state
      if (lead.dischargeSheet) {
        newStage = CaseStage.DISCHARGED
      } else if (lead.admissionRecord) {
        newStage = CaseStage.INITIATED
      } else if (lead.kypSubmission) {
        if (lead.kypSubmission.preAuthData) {
          // Check if pre-auth was raised by BD
          if (lead.kypSubmission.preAuthData.preAuthRaisedAt) {
            // Check if insurance completed it
            if (lead.kypSubmission.preAuthData.handledAt) {
              newStage = CaseStage.PREAUTH_COMPLETE
            } else {
              newStage = CaseStage.PREAUTH_RAISED
            }
          } else {
            // Pre-auth exists but wasn't raised by BD (old flow)
            if (lead.kypSubmission.status === 'PRE_AUTH_COMPLETE') {
              newStage = CaseStage.PREAUTH_COMPLETE
            } else {
              newStage = CaseStage.KYP_COMPLETE
            }
          }
        } else {
          // KYP submitted but no pre-auth
          if (lead.kypSubmission.status === 'PENDING') {
            newStage = CaseStage.KYP_PENDING
          } else {
            newStage = CaseStage.KYP_COMPLETE
          }
        }
      } else {
        // No KYP submission
        newStage = CaseStage.NEW_LEAD
      }

      // Only update if stage is different
      if (lead.caseStage !== newStage) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { caseStage: newStage },
        })

        // Create stage history entry if it doesn't exist
        const existingHistory = await prisma.caseStageHistory.findFirst({
          where: {
            leadId: lead.id,
            toStage: newStage,
          },
        })

        if (!existingHistory) {
          await prisma.caseStageHistory.create({
            data: {
              leadId: lead.id,
              fromStage: lead.caseStage,
              toStage: newStage,
              changedById: lead.updatedById || lead.createdById,
              note: 'Migrated from existing data',
            },
          })
        }

        migrated++
        console.log(`Migrated lead ${lead.leadRef}: ${lead.caseStage} -> ${newStage}`)
      } else {
        skipped++
      }
    }

    console.log(`\nMigration complete!`)
    console.log(`- Migrated: ${migrated} leads`)
    console.log(`- Skipped: ${skipped} leads (already correct)`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateCaseStages()
  .then(() => {
    console.log('Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
