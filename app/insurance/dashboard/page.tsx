'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { FileCheck, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function InsuranceDashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: cases, isLoading } = useQuery({
    queryKey: ['insurance', 'cases', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        pipelineStage: 'INSURANCE',
      })
      const leads = await apiGet(`/api/leads?${params.toString()}`)
      return leads.map((lead: any) => ({
        ...lead,
        insuranceCase: lead.insuranceCase || {
          caseStatus: 'IN_PROGRESS',
          submittedAt: lead.updatedDate,
        },
      }))
    },
  })

  const updateCaseMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: any }) => {
      // Update lead and create/update insurance case
      return apiPatch(`/api/leads/${leadId}`, {
        ...data,
        insuranceCase: {
          update: data.insuranceCase,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance'] })
      setSelectedCase(null)
      toast.success('Case updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update case')
    },
  })

  const statusStats = {
    IN_PROGRESS: cases?.filter((c: any) => c.insuranceCase?.caseStatus === 'IN_PROGRESS').length || 0,
    APPROVED: cases?.filter((c: any) => c.insuranceCase?.caseStatus === 'APPROVED').length || 0,
    REJECTED: cases?.filter((c: any) => c.insuranceCase?.caseStatus === 'REJECTED').length || 0,
    QUERY: cases?.filter((c: any) => c.insuranceCase?.caseStatus === 'QUERY').length || 0,
  }

  const totalCases = cases?.length || 0
  const approvalRate = totalCases > 0 ? ((statusStats.APPROVED / totalCases) * 100).toFixed(1) : '0'

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Insurance Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage insurance cases and approvals</p>
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
                <CardTitle className="text-sm font-medium">Cases in Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusStats.IN_PROGRESS}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusStats.APPROVED}</div>
                <p className="text-xs text-muted-foreground mt-1">Approved cases</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusStats.REJECTED}</div>
                <p className="text-xs text-muted-foreground mt-1">Rejected cases</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvalRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Success rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Cases Table */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Cases</CardTitle>
              <CardDescription>All cases requiring insurance approval</CardDescription>
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
                      <TableHead>Insurance</TableHead>
                      <TableHead>TPA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases?.map((insuranceCase: any) => {
                      const caseStatus = insuranceCase.insuranceCase?.caseStatus || 'IN_PROGRESS'
                      return (
                        <TableRow key={insuranceCase.id}>
                          <TableCell className="font-medium">{insuranceCase.leadRef}</TableCell>
                          <TableCell>{insuranceCase.patientName}</TableCell>
                          <TableCell>{insuranceCase.hospitalName}</TableCell>
                          <TableCell>{insuranceCase.insuranceName || '-'}</TableCell>
                          <TableCell>{insuranceCase.tpa || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                caseStatus === 'APPROVED'
                                  ? 'default'
                                  : caseStatus === 'REJECTED'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {caseStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {insuranceCase.insuranceCase?.submittedAt
                              ? format(new Date(insuranceCase.insuranceCase.submittedAt), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCase(insuranceCase)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!cases || cases.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No insurance cases found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Case Detail Dialog */}
          <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Insurance Case Details</DialogTitle>
                <DialogDescription>Update case status and approval information</DialogDescription>
              </DialogHeader>
              {selectedCase && (
                <CaseDetailForm
                  insuranceCase={selectedCase}
                  onUpdate={(data) =>
                    updateCaseMutation.mutate({ leadId: selectedCase.id, data })
                  }
                  isLoading={updateCaseMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function CaseDetailForm({
  insuranceCase,
  onUpdate,
  isLoading,
}: {
  insuranceCase: any
  onUpdate: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    caseStatus: insuranceCase.insuranceCase?.caseStatus || 'IN_PROGRESS',
    approvalAmount: insuranceCase.insuranceCase?.approvalAmount || insuranceCase.sumInsured || '',
    tpaRemarks: insuranceCase.insuranceCase?.tpaRemarks || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate({
      insuranceCase: {
        caseStatus: formData.caseStatus,
        approvalAmount: parseFloat(formData.approvalAmount.toString()),
        tpaRemarks: formData.tpaRemarks,
        approvedAt: formData.caseStatus === 'APPROVED' ? new Date().toISOString() : null,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lead Reference</Label>
          <Input value={insuranceCase.leadRef} readOnly />
        </div>
        <div>
          <Label>Patient Name</Label>
          <Input value={insuranceCase.patientName} readOnly />
        </div>
        <div>
          <Label>Hospital</Label>
          <Input value={insuranceCase.hospitalName} readOnly />
        </div>
        <div>
          <Label>Insurance Company</Label>
          <Input value={insuranceCase.insuranceName || ''} readOnly />
        </div>
        <div>
          <Label>TPA</Label>
          <Input value={insuranceCase.tpa || ''} readOnly />
        </div>
        <div>
          <Label>Sum Insured</Label>
          <Input value={insuranceCase.sumInsured || ''} readOnly />
        </div>
      </div>

      <div>
        <Label>Case Status</Label>
        <Select
          value={formData.caseStatus}
          onValueChange={(value) => setFormData({ ...formData, caseStatus: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="QUERY">Query</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Approval Amount</Label>
        <Input
          type="number"
          value={formData.approvalAmount}
          onChange={(e) => setFormData({ ...formData, approvalAmount: e.target.value })}
          placeholder="Enter approval amount"
        />
      </div>

      <div>
        <Label>TPA Remarks</Label>
        <Textarea
          value={formData.tpaRemarks}
          onChange={(e) => setFormData({ ...formData, tpaRemarks: e.target.value })}
          rows={4}
          placeholder="Enter TPA remarks or notes"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Case'}
        </Button>
      </div>
    </form>
  )
}

