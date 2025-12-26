'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Heart, Clock, CheckCircle, XCircle, User, Building, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface MentalHealthRequest {
  id: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  hrResponse: string | null
  respondedAt: string | null
  createdAt: string
  deadline: string
  hoursRemaining: number
  isOverdue: boolean
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
  APPROVED: { label: 'Responded', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Declined', variant: 'destructive' as const, icon: XCircle },
}

export default function HRMentalHealthPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery<MentalHealthRequest[]>({
    queryKey: ['hr-mental-health', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return apiGet<MentalHealthRequest[]>(`/api/hr/mental-health${params}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, hrResponse }: { id: string; status: string; hrResponse?: string }) =>
      apiPatch<MentalHealthRequest>(`/api/hr/mental-health?id=${id}`, { status, hrResponse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-mental-health'] })
      toast.success('Response submitted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const pendingCount = requests?.filter((r) => r.status === 'PENDING').length || 0
  const overdueCount = requests?.filter((r) => r.isOverdue).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mental Health Support Requests</h1>
          <p className="text-muted-foreground mt-1">
            Respond within 48 hours - Handle with care and confidentiality
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${overdueCount > 0 ? 'text-red-700' : ''}`}>
              Overdue (48hr SLA)
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-700' : ''}`}>
              {overdueCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responded</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r) => r.status !== 'PENDING').length || 0}
            </div>
          </CardContent>
        </Card>
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
                  <SelectItem value="APPROVED">Responded</SelectItem>
                  <SelectItem value="REJECTED">Declined</SelectItem>
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
                  <div 
                    key={request.id} 
                    className={`border rounded-lg p-4 ${request.isOverdue ? 'border-red-300 bg-red-50' : ''}`}
                  >
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
                      <div className="flex items-center gap-2">
                        {request.status === 'PENDING' && (
                          <Badge 
                            variant={request.isOverdue ? 'destructive' : 'outline'}
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {request.isOverdue 
                              ? 'OVERDUE' 
                              : `${request.hoursRemaining}h remaining`}
                          </Badge>
                        )}
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      Submitted on {format(new Date(request.createdAt), 'PPP p')}
                    </p>

                    {request.reason ? (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Employee&apos;s message:</p>
                        <p className="text-sm bg-white p-3 rounded border">{request.reason}</p>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-muted/50 rounded">
                        <p className="text-sm text-muted-foreground italic">
                          Employee requested support without sharing details
                        </p>
                      </div>
                    )}

                    {request.hrResponse && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-700">Your Response:</p>
                        <p className="text-sm text-green-600">{request.hrResponse}</p>
                      </div>
                    )}

                    {request.status === 'PENDING' && (
                      <RespondDialog
                        request={request}
                        onSubmit={(hrResponse) => updateMutation.mutate({
                          id: request.id,
                          status: 'APPROVED',
                          hrResponse,
                        })}
                        isLoading={updateMutation.isPending}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mental health requests</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RespondDialog({
  request,
  onSubmit,
  isLoading,
}: {
  request: MentalHealthRequest
  onSubmit: (response: string) => void
  isLoading: boolean
}) {
  const [response, setResponse] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (!response.trim()) {
      toast.error('Please provide a response')
      return
    }
    onSubmit(response)
    setOpen(false)
    setResponse('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Heart className="h-4 w-4 mr-2" />
          Respond to Request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to {request.employee.user.name}</DialogTitle>
          <DialogDescription>
            Provide support and guidance. Your response will be visible to the employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Your Response *</Label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Provide a supportive and helpful response..."
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !response.trim()}>
              {isLoading ? 'Sending...' : 'Send Response'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

