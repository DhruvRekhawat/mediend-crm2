'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { apiGet } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

interface QueryResult {
  answer: string
  data?: any[]
  type: 'text' | 'table' | 'chart'
}

export default function AIInsightsPage() {
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState('')

  const { data: result, isLoading, refetch } = useQuery<QueryResult>({
    queryKey: ['ai-insights', lastQuery],
    queryFn: async () => {
      return processAIQuery(lastQuery)
    },
    enabled: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLastQuery(query)
    refetch()
  }

  const quickQueries = [
    'Best BD this month',
    'Best hospital for orthopedics',
    'Which source works best for cardiac surgeries?',
    'Top 5 performing teams',
    'Most common treatment types',
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">AI Insights</h1>
            <p className="text-muted-foreground mt-1">Ask questions about your sales data</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Ask Your Data
              </CardTitle>
              <CardDescription>
                Ask natural language questions about your sales performance, leads, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Best BD this month?"
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !query.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Ask'
                  )}
                </Button>
              </form>

              <div>
                <p className="text-sm font-medium mb-2">Quick Questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQueries.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery(q)
                        setLastQuery(q)
                        refetch()
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>Answer to: &quot;{lastQuery}&quot;</CardDescription>
              </CardHeader>
              <CardContent>
                {result.type === 'text' && (
                  <div className="prose prose-sm max-w-none">
                    <p>{result.answer}</p>
                  </div>
                )}

                {result.type === 'table' && result.data && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{result.answer}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(result.data[0] || {}).map((key) => (
                            <TableHead key={key}>{key.replace(/_/g, ' ')}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.data.slice(0, 10).map((row: any, idx) => (
                          <TableRow key={idx}>
                            {Object.values(row).map((value: any, cellIdx) => (
                              <TableCell key={cellIdx}>
                                {typeof value === 'number' ? value.toLocaleString('en-IN') : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

async function processAIQuery(query: string): Promise<QueryResult> {
  const lowerQuery = query.toLowerCase()

  // Best BD queries
  if (lowerQuery.includes('best bd') || lowerQuery.includes('top bd')) {
    const timeRange = extractTimeRange(query)
    const params = new URLSearchParams({
      type: 'bd',
      ...timeRange,
    })
    const data = await apiGet(`/api/analytics/leaderboard?${params.toString()}`)
    return {
      answer: `The best performing BD${timeRange.startDate ? ` in the selected period` : ''} is ${data[0]?.bdName || 'N/A'} with ${data[0]?.closedLeads || 0} closed leads and ₹${(data[0]?.netProfit || 0).toLocaleString('en-IN')} net profit.`,
      data: data.slice(0, 5).map((bd: any) => ({
        Rank: data.indexOf(bd) + 1,
        'BD Name': bd.bdName,
        'Team': bd.teamName,
        'Closed Leads': bd.closedLeads,
        'Net Profit': `₹${bd.netProfit.toLocaleString('en-IN')}`,
      })),
      type: 'table',
    }
  }

  // Best hospital queries
  if (lowerQuery.includes('best hospital') || lowerQuery.includes('top hospital')) {
    const treatment = extractTreatment(query)
    const params = new URLSearchParams({
      ...extractTimeRange(query),
      ...(treatment ? { treatment } : {}),
    })
    const leads = await apiGet(`/api/leads?${params.toString()}&pipelineStage=COMPLETED`)
    const hospitalStats = groupByHospital(leads)
    const topHospital = hospitalStats[0]
    return {
      answer: `The best performing hospital${treatment ? ` for ${treatment}` : ''} is ${topHospital?.hospital || 'N/A'} with ${topHospital?.count || 0} surgeries and ₹${(topHospital?.profit || 0).toLocaleString('en-IN')} net profit.`,
      data: hospitalStats.slice(0, 5).map((h: any) => ({
        Hospital: h.hospital,
        Surgeries: h.count,
        'Net Profit': `₹${h.profit.toLocaleString('en-IN')}`,
      })),
      type: 'table',
    }
  }

  // Source queries
  if (lowerQuery.includes('source') || lowerQuery.includes('campaign')) {
    const treatment = extractTreatment(query)
    const params = new URLSearchParams({
      ...extractTimeRange(query),
      ...(treatment ? { treatment } : {}),
    })
    const leads = await apiGet(`/api/leads?${params.toString()}`)
    const sourceStats = groupBySource(leads)
    const topSource = sourceStats[0]
    return {
      answer: `The best performing source${treatment ? ` for ${treatment}` : ''} is ${topSource?.source || 'N/A'} with ${topSource?.conversions || 0} conversions and a ${topSource?.conversionRate || 0}% conversion rate.`,
      data: sourceStats.slice(0, 5).map((s: any) => ({
        Source: s.source,
        Leads: s.leads,
        Conversions: s.conversions,
        'Conversion Rate': `${s.conversionRate}%`,
        'Net Profit': `₹${s.profit.toLocaleString('en-IN')}`,
      })),
      type: 'table',
    }
  }

  // Team queries
  if (lowerQuery.includes('team') || lowerQuery.includes('top team')) {
    const params = new URLSearchParams({
      type: 'team',
      ...extractTimeRange(query),
    })
    const data = await apiGet(`/api/analytics/leaderboard?${params.toString()}`)
    return {
      answer: `The top performing team${extractTimeRange(query).startDate ? ' in the selected period' : ''} is ${data[0]?.teamName || 'N/A'} with ${data[0]?.closedLeads || 0} closed leads.`,
      data: data.slice(0, 5).map((team: any) => ({
        Rank: data.indexOf(team) + 1,
        'Team Name': team.teamName,
        'Closed Leads': team.closedLeads,
        'Net Profit': `₹${team.netProfit.toLocaleString('en-IN')}`,
      })),
      type: 'table',
    }
  }

  // Default response
  return {
    answer: "I can help you find information about BDs, hospitals, sources, teams, and treatments. Try asking questions like 'Best BD this month' or 'Best hospital for orthopedics'.",
    type: 'text',
  }
}

function extractTimeRange(query: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    }
  }

  if (lowerQuery.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  if (lowerQuery.includes('this week')) {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    }
  }

  return {}
}

function extractTreatment(query: string): string | null {
  const treatments = [
    'orthopedic',
    'cardiac',
    'neurology',
    'oncology',
    'gastroenterology',
    'urology',
    'gynecology',
  ]

  for (const treatment of treatments) {
    if (query.toLowerCase().includes(treatment)) {
      return treatment
    }
  }

  return null
}

function groupByHospital(leads: any[]): Array<{ hospital: string; count: number; profit: number }> {
  const grouped: Record<string, { count: number; profit: number }> = {}

  leads.forEach((lead) => {
    const hospital = lead.hospitalName || 'Unknown'
    if (!grouped[hospital]) {
      grouped[hospital] = { count: 0, profit: 0 }
    }
    grouped[hospital].count++
    grouped[hospital].profit += lead.netProfit || 0
  })

  return Object.entries(grouped)
    .map(([hospital, stats]) => ({ hospital, ...stats }))
    .sort((a, b) => b.profit - a.profit)
}

function groupBySource(leads: any[]): Array<{
  source: string
  leads: number
  conversions: number
  conversionRate: number
  profit: number
}> {
  const grouped: Record<string, { leads: number; conversions: number; profit: number }> = {}

  leads.forEach((lead) => {
    const source = lead.source || 'Unknown'
    if (!grouped[source]) {
      grouped[source] = { leads: 0, conversions: 0, profit: 0 }
    }
    grouped[source].leads++
    if (lead.pipelineStage === 'COMPLETED') {
      grouped[source].conversions++
      grouped[source].profit += lead.netProfit || 0
    }
  })

  return Object.entries(grouped)
    .map(([source, stats]) => ({
      source,
      leads: stats.leads,
      conversions: stats.conversions,
      conversionRate: stats.leads > 0 ? Math.round((stats.conversions / stats.leads) * 100) : 0,
      profit: stats.profit,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
}

