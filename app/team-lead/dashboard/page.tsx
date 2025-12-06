'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// Badge import removed
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import { useState, useEffect } from 'react'
import { Users, Target, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TeamLeadDashboardPage() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {

    // eslint-disable-next-line
    setDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    })
  }, [])

  const { data: teamStats, isLoading } = useQuery<any>({
    queryKey: ['analytics', 'team', user?.teamId, dateRange],
    queryFn: async () => {
      if (!user?.teamId) return null
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        teamId: user.teamId,
      })
      return apiGet(`/api/analytics/dashboard?${params.toString()}`)
    },
    enabled: !!user?.teamId,
  })

  const { data: bdList } = useQuery<any[]>({
    queryKey: ['users', 'team', user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return []
      return apiGet(`/api/users?teamId=${user.teamId}&role=BD`)
    },
    enabled: !!user?.teamId,
  })

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Team Lead Dashboard</h1>
              <p className="text-muted-foreground mt-1">Your team&apos;s performance overview</p>
            </div>
            <div className="flex gap-2">
              <Link href="/team-lead/pipeline">
                <Button variant="outline">View Pipeline</Button>
              </Link>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Leads created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.totalSurgeries || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Surgeries completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.conversionRate?.toFixed(1) || '0'}%</div>
                <p className="text-xs text-muted-foreground mt-1">Leads to surgeries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{teamStats?.totalProfit?.toLocaleString('en-IN') || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total net profit</p>
              </CardContent>
            </Card>
          </div>

          {/* BD Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team BDs Performance</CardTitle>
              <CardDescription>Performance metrics for your team members</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BD Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Leads Handled</TableHead>
                      <TableHead>Closed Leads</TableHead>
                      <TableHead>Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bdList?.map((bd: any) => (
                      <TableRow key={bd.id}>
                        <TableCell className="font-medium">{bd.name}</TableCell>
                        <TableCell>{bd.email}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                    {(!bdList || bdList.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No BDs in your team
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

