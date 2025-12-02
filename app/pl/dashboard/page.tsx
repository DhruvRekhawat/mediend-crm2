'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function PLDashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: records, isLoading } = useQuery({
    queryKey: ['pl', 'records', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        pipelineStage: 'PL,COMPLETED',
      })
      const leads = await apiGet(`/api/leads?${params.toString()}`)
      return leads.map((lead: any) => ({
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

  const updateRecordMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: any }) => {
      return apiPatch(`/api/leads/${leadId}`, {
        ...data,
        plRecord: {
          update: data.plRecord,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pl'] })
      setSelectedRecord(null)
      toast.success('P/L record updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update record')
    },
  })

  const totalProfit = records?.reduce((sum: number, r: any) => sum + (r.plRecord?.finalProfit || 0), 0) || 0
  const avgTicketSize = records?.length > 0 ? totalProfit / records.length : 0
  const pendingPayouts = records?.filter(
    (r: any) =>
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
            <CardContent>
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
                      <TableHead>Net Profit</TableHead>
                      <TableHead>Hospital Payout</TableHead>
                      <TableHead>Doctor Payout</TableHead>
                      <TableHead>Invoice Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records?.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.leadRef}</TableCell>
                        <TableCell>{record.patientName}</TableCell>
                        <TableCell>{record.hospitalName}</TableCell>
                        <TableCell>{record.treatment}</TableCell>
                        <TableCell>₹{(record.plRecord?.finalProfit || record.netProfit || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.plRecord?.hospitalPayoutStatus === 'PAID'
                                ? 'default'
                                : record.plRecord?.hospitalPayoutStatus === 'PARTIAL'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {record.plRecord?.hospitalPayoutStatus || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.plRecord?.doctorPayoutStatus === 'PAID'
                                ? 'default'
                                : record.plRecord?.doctorPayoutStatus === 'PARTIAL'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {record.plRecord?.doctorPayoutStatus || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.plRecord?.mediendInvoiceStatus === 'PAID'
                                ? 'default'
                                : record.plRecord?.mediendInvoiceStatus === 'SENT'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {record.plRecord?.mediendInvoiceStatus || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                          >
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!records || records.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No P/L records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Record Detail Dialog */}
          <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>P/L Record Details</DialogTitle>
                <DialogDescription>Update payout and invoice status</DialogDescription>
              </DialogHeader>
              {selectedRecord && (
                <PLRecordForm
                  record={selectedRecord}
                  onUpdate={(data) =>
                    updateRecordMutation.mutate({ leadId: selectedRecord.id, data })
                  }
                  isLoading={updateRecordMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function PLRecordForm({
  record,
  onUpdate,
  isLoading,
}: {
  record: any
  onUpdate: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    finalProfit: record.plRecord?.finalProfit || record.netProfit || 0,
    hospitalPayoutStatus: record.plRecord?.hospitalPayoutStatus || 'PENDING',
    doctorPayoutStatus: record.plRecord?.doctorPayoutStatus || 'PENDING',
    mediendInvoiceStatus: record.plRecord?.mediendInvoiceStatus || 'PENDING',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate({
      netProfit: formData.finalProfit,
      plRecord: {
        finalProfit: formData.finalProfit,
        hospitalPayoutStatus: formData.hospitalPayoutStatus,
        doctorPayoutStatus: formData.doctorPayoutStatus,
        mediendInvoiceStatus: formData.mediendInvoiceStatus,
        closedAt: formData.hospitalPayoutStatus === 'PAID' && formData.doctorPayoutStatus === 'PAID' 
          ? new Date().toISOString() 
          : null,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lead Reference</Label>
          <Input value={record.leadRef} readOnly />
        </div>
        <div>
          <Label>Patient Name</Label>
          <Input value={record.patientName} readOnly />
        </div>
        <div>
          <Label>Hospital</Label>
          <Input value={record.hospitalName} readOnly />
        </div>
        <div>
          <Label>Treatment</Label>
          <Input value={record.treatment} readOnly />
        </div>
      </div>

      <div>
        <Label>Final Profit</Label>
        <Input
          type="number"
          value={formData.finalProfit}
          onChange={(e) => setFormData({ ...formData, finalProfit: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Hospital Payout Status</Label>
          <Select
            value={formData.hospitalPayoutStatus}
            onValueChange={(value) => setFormData({ ...formData, hospitalPayoutStatus: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Doctor Payout Status</Label>
          <Select
            value={formData.doctorPayoutStatus}
            onValueChange={(value) => setFormData({ ...formData, doctorPayoutStatus: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Mediend Invoice Status</Label>
          <Select
            value={formData.mediendInvoiceStatus}
            onValueChange={(value) => setFormData({ ...formData, mediendInvoiceStatus: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Record'}
        </Button>
      </div>
    </form>
  )
}

