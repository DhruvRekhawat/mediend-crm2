'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { TrendingUp, Clock, CheckCircle, XCircle, User, Building, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface IncrementRequest {
  id: string
  currentSalary: number
  requestedAmount: number | null
  reason: string
  achievements: string | null
  documents: string[] | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvalPercentage: number | null
  hrRemarks: string | null
  createdAt: string
  employee: {
    employeeCode: string
    user: {
      name: string
      email: string
    }
    department: {
      name: string
    } | null
  }
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function HRIncrementsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery<IncrementRequest[]>({
    queryKey: ['hr-increments', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return apiGet<IncrementRequest[]>(`/api/hr/increments${params}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, approvalPercentage, hrRemarks }: {
      id: string
      status: string
      approvalPercentage?: number
      hrRemarks?: string
    }) => apiPatch<IncrementRequest>(`/api/hr/increments?id=${id}`, { status, approvalPercentage, hrRemarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-increments'] })
      toast.success('Request updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const pendingCount = requests?.filter((r) => r.status === 'PENDING').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Increment Requests</h1>
          <p className="text-muted-foreground mt-1">Review and approve employee increment applications</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = requests?.filter((r) => r.status === key).length || 0
          const Icon = config.icon
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 mt-2">
              <span>Filter by status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status]
                const StatusIcon = statusConfig.icon
                return (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.employee.user.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({request.employee.employeeCode})
                          </span>
                        </div>
                        {request.employee.department && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {request.employee.department.name}
                          </div>
                        )}
                      </div>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Current Salary:</span>
                        <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
                      </div>
                      {request.requestedAmount && (
                        <div>
                          <span className="text-muted-foreground">Requested:</span>
                          <p className="font-medium">{formatCurrency(request.requestedAmount)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">{format(new Date(request.createdAt), 'PP')}</p>
                      </div>
                    </div>

                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm bg-muted/50 p-3 rounded mb-3">{request.reason}</p>

                    {request.achievements && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Achievements:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded">{request.achievements}</p>
                      </div>
                    )}

                    {request.documents && request.documents.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Supporting Documents:
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {request.documents.map((doc, i) => (
                            <a
                              key={i}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Document {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.status === 'APPROVED' && request.approvalPercentage && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-700">
                          Approved: {request.approvalPercentage}% increment
                        </p>
                        {request.hrRemarks && (
                          <p className="text-sm text-green-600 mt-1">{request.hrRemarks}</p>
                        )}
                      </div>
                    )}

                    {request.status === 'REJECTED' && request.hrRemarks && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-600">{request.hrRemarks}</p>
                      </div>
                    )}

                    {request.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <ApproveDialog
                          request={request}
                          onSubmit={(approvalPercentage, hrRemarks) => updateMutation.mutate({
                            id: request.id,
                            status: 'APPROVED',
                            approvalPercentage,
                            hrRemarks,
                          })}
                          isLoading={updateMutation.isPending}
                        />
                        <RejectDialog
                          request={request}
                          onSubmit={(hrRemarks) => updateMutation.mutate({
                            id: request.id,
                            status: 'REJECTED',
                            hrRemarks,
                          })}
                          isLoading={updateMutation.isPending}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No increment requests</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ApproveDialog({
  request,
  onSubmit,
  isLoading,
}: {
  request: IncrementRequest
  onSubmit: (approvalPercentage: number, hrRemarks?: string) => void
  isLoading: boolean
}) {
  const [approvalPercentage, setApprovalPercentage] = useState('')
  const [hrRemarks, setHrRemarks] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (!approvalPercentage || parseFloat(approvalPercentage) <= 0) {
      toast.error('Please enter a valid increment percentage')
      return
    }
    onSubmit(parseFloat(approvalPercentage), hrRemarks || undefined)
    setOpen(false)
    setApprovalPercentage('')
    setHrRemarks('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Increment</DialogTitle>
          <DialogDescription>
            Approve increment for {request.employee.user.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">
              Current Salary: <strong>{formatCurrency(request.currentSalary)}</strong>
            </p>
            {request.requestedAmount && (
              <p className="text-sm">
                Requested Amount: <strong>{formatCurrency(request.requestedAmount)}</strong>
              </p>
            )}
          </div>
          <div>
            <Label>Approval Percentage *</Label>
            <Input
              type="number"
              value={approvalPercentage}
              onChange={(e) => setApprovalPercentage(e.target.value)}
              placeholder="e.g., 10"
              min={0}
              max={100}
            />
          </div>
          <div>
            <Label>Remarks (Optional)</Label>
            <Textarea
              value={hrRemarks}
              onChange={(e) => setHrRemarks(e.target.value)}
              placeholder="Any remarks for the employee..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  request,
  onSubmit,
  isLoading,
}: {
  request: IncrementRequest
  onSubmit: (hrRemarks: string) => void
  isLoading: boolean
}) {
  const [hrRemarks, setHrRemarks] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (!hrRemarks.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    onSubmit(hrRemarks)
    setOpen(false)
    setHrRemarks('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Increment Request</DialogTitle>
          <DialogDescription>
            Reject increment request from {request.employee.user.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason for Rejection *</Label>
            <Textarea
              value={hrRemarks}
              onChange={(e) => setHrRemarks(e.target.value)}
              placeholder="Explain why the request is being rejected..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={isLoading || !hrRemarks.trim()}>
              {isLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

