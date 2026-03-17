/**
 * Backfill script: resolve numeric source/campaign strings to proper names.
 *
 * Leads synced before the lookup-based mapper was working have source values
 * like "100", "25" instead of "Facebook", "Google". This script:
 *   1. Loads source and source_campaign lookup maps from MySQL.
 *   2. Finds all leads in PostgreSQL where source looks like a numeric string.
 *   3. Updates them with the resolved name.
 *
 * Usage:
 *   docker compose --profile tools run --rm sync-leads \
 *     --entrypoint "bun run scripts/backfill-source-names.ts"
 *
 * Or add a one-off service in docker-compose.yml (see sync-leads as reference).
 */
import 'dotenv/config'
import { queryMySQL, closeMySQLPool } from '@/lib/mysql-source-client'
import { prisma } from '@/lib/prisma'

const CHUNK_SIZE = 500

async function main() {
  console.log('🔄 Backfill: resolving numeric source/campaign names...')

  // Load source lookup: id → name
  const sourceRows = await queryMySQL<{ id: number; Source: string }>(
    'SELECT id, Source FROM source'
  )
  const sourceMap = new Map(sourceRows.map((r) => [String(r.id), r.Source.trim()]))
  console.log(`✅ Loaded ${sourceMap.size} sources`)

  // Load campaign lookup: id → { campaign, SourceName }
  const campaignRows = await queryMySQL<{ id: number; campaign: string; SourceName: string | null }>(
    `SELECT sc.id, sc.campaign,
            s.Source AS SourceName
     FROM source_campaign sc
     LEFT JOIN source s ON s.id = sc.source`
  )
  const campaignMap = new Map(
    campaignRows.map((r) => [String(r.id), {
      campaignName: r.campaign.trim(),
      sourceName: (r.SourceName?.trim() && !/^\d+$/.test(r.SourceName.trim()))
        ? r.SourceName.trim()
        : 'Unknown',
    }])
  )
  console.log(`✅ Loaded ${campaignMap.size} campaigns`)

  await closeMySQLPool()

  // Find leads with numeric source values
  const leadsWithNumericSource = await prisma.lead.findMany({
    where: { source: { not: null } },
    select: { id: true, source: true, campaignName: true, leadSource: true },
  })

  const toFix = leadsWithNumericSource.filter(
    (l) => l.source !== null && /^\d+$/.test(l.source)
  )
  console.log(`📋 Found ${toFix.length} leads with numeric source (out of ${leadsWithNumericSource.length} with source set)`)

  if (toFix.length === 0) {
    console.log('✅ Nothing to fix.')
    return
  }

  let fixed = 0
  let skipped = 0

  for (let i = 0; i < toFix.length; i += CHUNK_SIZE) {
    const chunk = toFix.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map(async (lead) => {
        // Try to resolve via leadSource (campaign id → source name)
        let resolvedSource: string | null = null
        let resolvedCampaign: string | null = null

        if (lead.leadSource != null) {
          const campaignInfo = campaignMap.get(String(lead.leadSource))
          if (campaignInfo) {
            resolvedSource = campaignInfo.sourceName
            resolvedCampaign = campaignInfo.campaignName
          }
        }

        // Fallback: treat the numeric source value itself as a source id
        if (!resolvedSource && lead.source) {
          resolvedSource = sourceMap.get(lead.source) ?? null
        }

        if (!resolvedSource) {
          skipped++
          return
        }

        const updateData: { source: string; campaignName?: string } = { source: resolvedSource }
        // Only update campaignName if it was also numeric/missing
        if (resolvedCampaign && (!lead.campaignName || /^\d+$/.test(lead.campaignName))) {
          updateData.campaignName = resolvedCampaign
        }

        await prisma.lead.update({ where: { id: lead.id }, data: updateData })
        fixed++
      })
    )

    console.log(`  Progress: ${Math.min(i + CHUNK_SIZE, toFix.length)} / ${toFix.length}`)
  }

  console.log(`\n✅ Done — Fixed: ${fixed}, Skipped (unresolvable): ${skipped}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
