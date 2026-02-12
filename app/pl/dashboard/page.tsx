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
import { DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'
// format import removed

export default function PLDashboardPage() {
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
  const { data: records, isLoading } = useQuery<Lead[]>({
    queryKey: ['pl', 'records', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        pipelineStage: 'PL,COMPLETED',
      })
      const leads = await apiGet<Lead[]>(`/api/leads?${params.toString()}`)
      return leads.map((lead: Lead) => ({
        ...lead,
        plRecord: lead.plRecord || {
          finalProfit: lead.netProfit || 0,
          hospitalPayoutStatus: 'PENDING',
          doctorPayoutStatus: 'PENDING',
          mediendInvoiceStatus: 'PENDING',
        },
      }))
    },
  })

  const totalProfit = records?.reduce((sum: number, r: Lead) => sum + (r.plRecord?.finalProfit || 0), 0) || 0
  const avgTicketSize = records && records.length > 0 ? totalProfit / records.length : 0
  const pendingPayouts = records?.filter(
    (r: Lead) =>
      r.plRecord?.hospitalPayoutStatus === 'PENDING' ||
      r.plRecord?.doctorPayoutStatus === 'PENDING'
  ).length || 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">P/L Dashboard</h1>
              <p className="text-muted-foreground mt-1">Profit & Loss management</p>
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
                <CardTitle className="text-sm font-medium">Total Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalProfit.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">Total profit realized</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{avgTicketSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Average per case</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPayouts}</div>
                <p className="text-xs text-muted-foreground mt-1">Cases pending payouts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle>P/L Records</CardTitle>
              <CardDescription>Profit & Loss records for completed surgeries</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>BDM</TableHead>
                      <TableHead>P. Number</TableHead>
                      <TableHead>P. Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Circle</TableHead>
                      <TableHead>Doctors</TableHead>
                      <TableHead>Hospitals</TableHead>
                      <TableHead>Surgery Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved/Cash</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Bill Amount</TableHead>
                      <TableHead>Payment Collected At</TableHead>
                      <TableHead>Lead Source</TableHead>
                      <TableHead>Hospital Share %</TableHead>
                      <TableHead>Hospital Share</TableHead>
                      <TableHead>Doctor Charges</TableHead>
                      <TableHead>D&C</TableHead>
                      <TableHead>Implant</TableHead>
                      <TableHead>Cab Charges</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead>Mediend Share %</TableHead>
                      <TableHead>Mediend Share</TableHead>
                      <TableHead>Mediend Net Profit</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Hospital Payout</TableHead>
                      <TableHead>Doctor Payout</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records?.map((record) => {
                      const pl = record.plRecord as Record<string, unknown> | undefined
                      const month = pl?.month ? new Date(pl.month as string).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '—'
                      const surgeryDate = pl?.surgeryDate || record.surgeryDate
                      const surgeryStr = surgeryDate ? new Date(surgeryDate as string).toLocaleDateString('en-IN') : '—'
                      const getStringValue = (value: unknown): string => {
                        if (typeof value === 'string' && value.length > 0) return value
                        if (value == null) return ''
                        if (typeof value === 'object' && Object.keys(value).length === 0) return ''
                        const str = String(value)
                        return str === '[object Object]' ? '' : str
                      }
                      // const categoryVal = record.category || getStringValue(pl?.category) || '—'
                      // const treatmentVal = record.treatment || getStringValue(pl?.treatment) || '—'
                      // const circleVal = record.circle || getStringValue(pl?.circle) || '—'
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="whitespace-nowrap">{month}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.managerName as string) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{((pl?.bdmName as string) || record.bd?.name || '—') as string}</TableCell>
                          <TableCell className="whitespace-nowrap">{getPhoneDisplay(record.phoneNumber, canViewPhoneNumber(user ? { role: user.role } : null))}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.patientName || '—'}</TableCell>
                          {/* <TableCell className="whitespace-nowrap">{categoryVal}</TableCell> */}
                          {/* <TableCell className="whitespace-nowrap">{treatmentVal}</TableCell> */}
                          {/* <TableCell className="whitespace-nowrap">{circleVal}</TableCell> */}
                          <TableCell className="whitespace-nowrap">{String(record.category || '') || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{String(record.treatment || '') || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{String(record.circle || '') || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{String((pl?.doctorName as string) || record.surgeonName || '') || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.hospitalName || (pl?.hospitalName as string) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{surgeryStr as string}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.paymentType as string) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.status as string) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{pl?.approvedOrCash != null ? String(pl.approvedOrCash) : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{((pl?.totalAmount != null && Number(pl.totalAmount) !== 0) ? `₹${Number(pl.totalAmount).toLocaleString('en-IN')}` : '—') as string}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.billAmount != null && Number(pl.billAmount) !== 0) ? `₹${Number(pl.billAmount).toLocaleString('en-IN')}` : (record.billAmount != null ? `₹${Number(record.billAmount).toLocaleString('en-IN')}` : '—')}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.paymentCollectedAt as string) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.leadSource as string) || record.source || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{pl?.hospitalSharePct != null ? `${pl.hospitalSharePct}%` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.hospitalShareAmount != null && Number(pl.hospitalShareAmount) !== 0) ? `₹${Number(pl.hospitalShareAmount).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.doctorCharges != null && Number(pl.doctorCharges) !== 0) ? `₹${Number(pl.doctorCharges).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.dcCharges != null && Number(pl.dcCharges) !== 0) ? `₹${Number(pl.dcCharges).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.implantCost != null && Number(pl.implantCost) !== 0) ? `₹${Number(pl.implantCost).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.cabCharges != null && Number(pl.cabCharges) !== 0) ? `₹${Number(pl.cabCharges).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.referralAmount != null && Number(pl.referralAmount) !== 0) ? `₹${Number(pl.referralAmount).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{pl?.mediendSharePct != null ? `${pl.mediendSharePct}%` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(pl?.mediendShareAmount != null && Number(pl.mediendShareAmount) !== 0) ? `₹${Number(pl.mediendShareAmount).toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium">₹{(record.plRecord?.finalProfit ?? record.plRecord?.mediendNetProfit ?? record.netProfit ?? 0).toLocaleString('en-IN')}</TableCell>
                          <TableCell className="whitespace-nowrap max-w-[120px] truncate" title={(pl?.remarks as string) || ''}>{(pl?.remarks as string) || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.hospitalPayoutStatus === 'PAID' ? 'default' : record.plRecord?.hospitalPayoutStatus === 'PARTIAL' ? 'secondary' : 'outline'}>
                              {record.plRecord?.hospitalPayoutStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.doctorPayoutStatus === 'PAID' ? 'default' : record.plRecord?.doctorPayoutStatus === 'PARTIAL' ? 'secondary' : 'outline'}>
                              {record.plRecord?.doctorPayoutStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.plRecord?.mediendInvoiceStatus === 'PAID' ? 'default' : record.plRecord?.mediendInvoiceStatus === 'SENT' ? 'secondary' : 'outline'}>
                              {record.plRecord?.mediendInvoiceStatus || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/pl/record/${record.id}`}>Update</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!records || records.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={33} className="text-center text-muted-foreground py-8">
                          No P/L records found
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
