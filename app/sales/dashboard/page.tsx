'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, DollarSign, Target, Calendar } from 'lucide-react'

interface DashboardStats {
  totalSurgeries: number
  totalProfit: number
  avgTicketSize: number
  totalLeads: number
  conversionRate: number
}

interface LeaderboardEntry {
  bdId?: string
  bdName?: string
  teamId?: string
  teamName?: string
  closedLeads: number
  netProfit: number
}

interface TodayLeadAssignment {
  bdId: string
  bdName: string
  bdEmail: string
  teamName: string | null
  teamCircle: string | null
  leadCount: number
  leads: Array<{
    id: string
    leadRef: string
    patientName: string
    createdDate: Date
  }>
}

interface TodayLeadAssignmentsResponse {
  date: string
  totalLeads: number
  assignments: TodayLeadAssignment[]
}

export default function SalesDashboardPage() {
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

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<DashboardStats>(`/api/analytics/dashboard?${params.toString()}`)
    },
  })

  const { data: teamLeaderboard, isLoading: teamsLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'team', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: 'team',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<LeaderboardEntry[]>(`/api/analytics/leaderboard?${params.toString()}`)
    },
  })

  const { data: bdLeaderboard, isLoading: bdsLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'bd', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: 'bd',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<LeaderboardEntry[]>(`/api/analytics/leaderboard?${params.toString()}`)
    },
  })

  const { data: todayAssignments, isLoading: todayLoading } = useQuery<TodayLeadAssignmentsResponse>({
    queryKey: ['analytics', 'today-leads-assignments'],
    queryFn: () => apiGet<TodayLeadAssignmentsResponse>('/api/analytics/today-leads-assignments'),
    refetchInterval: 60000, // Refetch every minute to keep data fresh
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Sales Dashboard</h1>
              <p className="text-muted-foreground mt-1">Sales performance overview</p>
            </div>
            <div className="flex gap-2">
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
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Leads created in period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSurgeries || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Surgeries completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.conversionRate?.toFixed(1) || '0'}%</div>
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
                  ₹{stats?.totalProfit?.toLocaleString('en-IN') || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total net profit</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Lead Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today&apos;s Lead Assignments</CardTitle>
                  <CardDescription>
                    New leads assigned to BDs today ({todayAssignments?.date || new Date().toISOString().split('T')[0]})
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">
                    {todayAssignments?.totalLeads || 0} Total Leads
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BD Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Leads Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayAssignments?.assignments.map((assignment) => (
                      <TableRow key={assignment.bdId}>
                        <TableCell className="font-medium">{assignment.bdName}</TableCell>
                        <TableCell className="text-muted-foreground">{assignment.bdEmail}</TableCell>
                        <TableCell>
                          {assignment.teamName ? (
                            <div className="flex items-center gap-2">
                              <span>{assignment.teamName}</span>
                              {assignment.teamCircle && (
                                <Badge variant="outline" className="text-xs">
                                  {assignment.teamCircle}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No Team</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default" className="text-sm">
                            {assignment.leadCount}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!todayAssignments || todayAssignments.assignments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No leads assigned today
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Team Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Team Leaderboard</CardTitle>
              <CardDescription>Team performance ranking</CardDescription>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Closed Leads</TableHead>
                      <TableHead>Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLeaderboard?.map((team, index) => (
                      <TableRow key={team.teamId}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{team.teamName}</TableCell>
                        <TableCell>{team.closedLeads}</TableCell>
                        <TableCell>₹{team.netProfit.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                    {(!teamLeaderboard || teamLeaderboard.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No team data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* BD Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>BD Leaderboard</CardTitle>
              <CardDescription>Top performing Business Development executives</CardDescription>
            </CardHeader>
            <CardContent>
              {bdsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>BD Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Closed Leads</TableHead>
                      <TableHead>Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bdLeaderboard?.slice(0, 20).map((bd, index) => (
                      <TableRow key={bd.bdId}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{bd.bdName}</TableCell>
                        <TableCell>{bd.teamName || 'No Team'}</TableCell>
                        <TableCell>{bd.closedLeads}</TableCell>
                        <TableCell>₹{bd.netProfit.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                    {(!bdLeaderboard || bdLeaderboard.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No BD data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </AuthenticatedLayout>
  )
}

