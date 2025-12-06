'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { getCachedAnalytics, cacheAnalytics } from '@/lib/indexeddb'
import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Activity } from 'lucide-react'

interface DashboardStats {
  totalSurgeries: number
  totalProfit: number
  avgTicketSize: number
  totalLeads: number
  conversionRate: number
}

export default function MDDashboardPage() {
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
  const [cachedData, setCachedData] = useState<DashboardStats | null>(null)

  const cacheKey = `md_dashboard_${dateRange.startDate}_${dateRange.endDate}`

  useEffect(() => {
    getCachedAnalytics(cacheKey).then((data) => {
      if (data) setCachedData(data)
    })
  }, [cacheKey])

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: async (): Promise<DashboardStats> => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      const data = await apiGet<DashboardStats>(`/api/analytics/dashboard?${params.toString()}`)
      await cacheAnalytics(cacheKey, data)
      return data
    },
    placeholderData: cachedData || undefined,
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">MD Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of all departments</p>
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

          {isLoading && !cachedData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-32 bg-slate-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Surgeries</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalSurgeries || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed in period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Net Profit</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{stats?.totalProfit?.toLocaleString('en-IN') || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Net profit realized
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.conversionRate?.toFixed(1) || '0'}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leads to surgeries
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{stats?.avgTicketSize?.toLocaleString('en-IN') || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average per surgery
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Sales</CardTitle>
                    <CardDescription>Sales department overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
                    <p className="text-sm text-muted-foreground">Total leads created</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Insurance</CardTitle>
                    <CardDescription>Insurance department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-sm text-muted-foreground">Cases in progress</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>P/L</CardTitle>
                    <CardDescription>Profit & Loss</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-sm text-muted-foreground">Pending payouts</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>HR</CardTitle>
                    <CardDescription>Human Resources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-sm text-muted-foreground">Active BDs</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
      </div>
    </AuthenticatedLayout>
  )
}

