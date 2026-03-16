import { queryMySQL } from '@/lib/mysql-source-client'

type CampaignRow = {
  id: number
  campaign: string
  SourceName: string | null
  TreatmentName: string | null
  SourceCampaignGroupName: string | null
  CampaignLocation: number | null
}

/** Resolve source name: avoid storing numeric IDs (campaign IDs wrongly used as source). */
function resolveSourceName(sourceName: string | null | undefined): string {
  const trimmed = sourceName?.trim()
  if (trimmed && trimmed !== '' && !/^\d+$/.test(trimmed)) return trimmed
  return 'Unknown'
}

export interface CampaignInfo {
  campaignName: string
  sourceName: string
  treatmentName: string | null
  groupName: string | null
  locationId: number | null
}

export interface LookupMaps {
  source: Map<number, string>
  campaign: Map<number, CampaignInfo>
  category: Map<number, string>
  treatment: Map<number, string>
  circle: Map<number, string>
  status: Map<number, string>
}

async function loadCampaigns(): Promise<CampaignRow[]> {
  const queries: { sql: string; label: string }[] = [
    {
      label: 'view source_campaign_all_name',
      sql: `SELECT id, campaign, SourceName, TreatmentName, SourceCampaignGroupName, CampaignLocation FROM source_campaign_all_name`,
    },
    {
      label: 'join source_campaign',
      sql: `SELECT sc.id, sc.campaign, s.Source AS SourceName, t.Treatment AS TreatmentName, scg.SourceCampaignGroup AS SourceCampaignGroupName, sc.CampaignLocation FROM source_campaign sc LEFT JOIN source s ON s.id = sc.source LEFT JOIN treatment t ON t.id = sc.TreatmentRefid LEFT JOIN sourcecampaigngroup scg ON scg.id = sc.SourceCampaignGroup`,
    },
    {
      label: 'join source_campaign (snake_case)',
      sql: `SELECT sc.id, sc.campaign, s.Source AS SourceName, t.Treatment AS TreatmentName, scg.SourceCampaignGroup AS SourceCampaignGroupName, sc.CampaignLocation FROM source_campaign sc LEFT JOIN source s ON s.id = sc.source LEFT JOIN treatment t ON t.id = sc.Treatment_Refid LEFT JOIN source_campaign_group scg ON scg.id = sc.Source_Campaign_Group`,
    },
    {
      label: 'minimal source_campaign',
      sql: `SELECT id, campaign, NULL AS SourceName, NULL AS TreatmentName, NULL AS SourceCampaignGroupName, NULL AS CampaignLocation FROM source_campaign`,
    },
  ]
  for (const { sql, label } of queries) {
    try {
      const rows = await queryMySQL<CampaignRow>(sql)
      console.log(`[lookup] Campaign loaded via ${label} (${rows.length} rows)`)
      return rows
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[lookup] ${label} failed: ${msg}`)
    }
  }
  console.warn('[lookup] All campaign queries failed, using empty campaign map')
  return []
}

export async function loadLookupMaps(): Promise<LookupMaps> {
  const [sources, campaigns, categories, treatments, circles, statuses] =
    await Promise.all([
      queryMySQL<{ id: number; Source: string }>(
        'SELECT id, Source FROM source'
      ),
      loadCampaigns(),
      queryMySQL<{ id: number; Category: string }>('SELECT id, Category FROM category'),
      queryMySQL<{ id: number; Treatment: string }>('SELECT id, Treatment FROM treatment'),
      queryMySQL<{ id: number; Circle: string }>('SELECT id, Circle FROM circle'),
      queryMySQL<{ id: number; Status: string }>('SELECT id, Status FROM status'),
    ])

  return {
    source: new Map(sources.map((r) => [r.id, r.Source.trim()])),
    campaign: new Map(
      campaigns.map((r) => [
        r.id,
        {
          campaignName: r.campaign.trim(),
          sourceName: resolveSourceName(r.SourceName),
          treatmentName: r.TreatmentName?.trim() ?? null,
          groupName: r.SourceCampaignGroupName?.trim() ?? null,
          locationId: r.CampaignLocation ?? null,
        },
      ])
    ),
    category: new Map(categories.map((r) => [r.id, r.Category.trim()])),
    treatment: new Map(treatments.map((r) => [r.id, r.Treatment.trim()])),
    circle: new Map(circles.map((r) => [r.id, r.Circle.trim()])),
    status: new Map(statuses.map((r) => [r.id, r.Status.trim()])),
  }
}
