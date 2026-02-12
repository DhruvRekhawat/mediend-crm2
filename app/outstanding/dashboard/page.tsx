'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Lead } from '@/hooks/use-leads'
import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, FileText, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function OutstandingDashboardPage() {
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

  const { data: records, isLoading } = useQuery<Lead[]>({
    queryKey: ['outstanding', 'records', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return await apiGet<Lead[]>(`/api/outstanding?${params.toString()}`)
    },
  })

  const totalPending = records?.reduce((sum: number, r: Lead) => {
    const plRecord = r.plRecord as { hospitalAmountPending?: number; doctorAmountPending?: number } | undefined
    const hospitalPending = plRecord?.hospitalAmountPending || 0
    const doctorPending = plRecord?.doctorAmountPending || 0
    return sum + hospitalPending + doctorPending
  }, 0) || 0

  const pendingCases = records?.filter(
    (r: Lead) =>
      r.plRecord?.hospitalPayoutStatus !== 'PAID' ||
      r.plRecord?.doctorPayoutStatus !== 'PAID' ||
      r.plRecord?.mediendInvoiceStatus !== 'PAID'
  ).length || 0

  const paidCases = records?.filter(
    (r: Lead) =>
      r.plRecord?.hospitalPayoutStatus === 'PAID' &&
      r.plRecord?.doctorPayoutStatus === 'PAID' &&
      r.plRecord?.mediendInvoiceStatus === 'PAID'
  ).length || 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Outstanding Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage payout statuses and pending amounts</p>
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
                <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalPending.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">Hospital + Doctor pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Cases</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCases}</div>
                <p className="text-xs text-muted-foreground mt-1">Cases with pending payouts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paidCases}</div>
                <p className="text-xs text-muted-foreground mt-1">All payouts completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{records?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Cases in period</p>
              </CardContent>
            </Card>
          </div>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Records</CardTitle>
              <CardDescription>Payout statuses and pending amounts for discharged cases</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Ref</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>BDM</TableHead>
                      <TableHead>Surgery Date</TableHead>
                      <TableHead>Bill Amount</TableHead>
                      <TableHead>Net Profit</TableHead>
                      <TableHead>Hospital Payout</TableHead>
                      <TableHead>Hospital Pending</TableHead>
                      <TableHead>Doctor Payout</TableHead>
                      <TableHead>Doctor Pending</TableHead>
                      <TableHead>Invoice Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records?.map((record) => {
                      const pl = record.plRecord as Record<string, unknown> | undefined
                      const surgeryDate = pl?.surgeryDate || record.surgeryDate
                      const surgeryStr = surgeryDate ? new Date(surgeryDate as string).toLocaleDateString('en-IN') : '—'
                      const hospitalPending = (pl?.hospitalAmountPending as number) || 0
                      const doctorPending = (pl?.doctorAmountPending as number) || 0
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="whitespace-nowrap">{record.leadRef ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.patientName ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.hospitalName ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.treatment ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.bdmName as string) || record.bd?.name || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{surgeryStr}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {(pl?.billAmount != null && Number(pl.billAmount) !== 0)
                              ? `₹${Number(pl.billAmount).toLocaleString('en-IN')}`
                              : (record.billAmount != null ? `₹${Number(record.billAmount).toLocaleString('en-IN')}` : '—')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            ₹{((record.plRecord as { finalProfit?: number; mediendNetProfit?: number } | undefined)?.finalProfit ?? (record.plRecord as { finalProfit?: number; mediendNetProfit?: number } | undefined)?.mediendNetProfit ?? record.netProfit ?? 0).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.hospitalPayoutStatus === 'PAID' ? 'default' : record.plRecord?.hospitalPayoutStatus === 'PARTIAL' ? 'secondary' : 'outline'}>
                              {record.plRecord?.hospitalPayoutStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            {hospitalPending > 0 ? `₹${hospitalPending.toLocaleString('en-IN')}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.doctorPayoutStatus === 'PAID' ? 'default' : record.plRecord?.doctorPayoutStatus === 'PARTIAL' ? 'secondary' : 'outline'}>
                              {record.plRecord?.doctorPayoutStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            {doctorPending > 0 ? `₹${doctorPending.toLocaleString('en-IN')}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.mediendInvoiceStatus === 'PAID' ? 'default' : record.plRecord?.mediendInvoiceStatus === 'SENT' ? 'secondary' : 'outline'}>
                              {record.plRecord?.mediendInvoiceStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/outstanding/edit/${record.id}`}>Update</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!records || records.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                          No outstanding records found
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
