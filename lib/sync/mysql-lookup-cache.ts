import { queryMySQL } from '@/lib/mysql-source-client'

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
  city: Map<number, string>
}

export async function loadLookupMaps(): Promise<LookupMaps> {
  const [sources, campaigns, categories, treatments, circles, statuses, cities] =
    await Promise.all([
      queryMySQL<{ id: number; Source: string }>(
        'SELECT id, Source FROM source'
      ),
      queryMySQL<{
        id: number
        campaign: string
        SourceName: string | null
        TreatmentName: string | null
        SourceCampaignGroupName: string | null
        CampaignLocation: number | null
      }>(
        `SELECT id, campaign, SourceName, TreatmentName,
                SourceCampaignGroupName, CampaignLocation
         FROM source_campaign_all_name`
      ),
      queryMySQL<{ id: number; Category: string }>('SELECT id, Category FROM category'),
      queryMySQL<{ id: number; Treatment: string }>('SELECT id, Treatment FROM treatment'),
      queryMySQL<{ id: number; Circle: string }>('SELECT id, Circle FROM circle'),
      queryMySQL<{ id: number; Status: string }>('SELECT id, Status FROM status'),
      queryMySQL<{ id: number; City: string }>('SELECT id, City FROM city'),
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
    city: new Map(cities.map((r) => [r.id, r.City.trim()])),
  }
}
