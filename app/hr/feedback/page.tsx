'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { MessageSquare, Clock, CheckCircle, Eye, User, Building } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Feedback {
  id: string
  content: string
  status: 'PENDING' | 'REVIEWED' | 'ACKNOWLEDGED'
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
  REVIEWED: { label: 'Reviewed', variant: 'default' as const, icon: Eye },
  ACKNOWLEDGED: { label: 'Acknowledged', variant: 'default' as const, icon: CheckCircle },
}

export default function HRFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: feedbacks, isLoading } = useQuery<Feedback[]>({
    queryKey: ['hr-feedback', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return apiGet<Feedback[]>(`/api/hr/feedback${params}`)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Feedback>(`/api/hr/feedback?id=${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-feedback'] })
      toast.success('Status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status')
    },
  })

  const pendingCount = feedbacks?.filter((f) => f.status === 'PENDING').length || 0
  const reviewedCount = feedbacks?.filter((f) => f.status === 'REVIEWED').length || 0
  const acknowledgedCount = feedbacks?.filter((f) => f.status === 'ACKNOWLEDGED').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback 360</h1>
          <p className="text-muted-foreground mt-1">View and manage employee feedback</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acknowledgedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback</CardTitle>
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
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : feedbacks && feedbacks.length > 0 ? (
            <div className="space-y-4">
              {feedbacks.map((feedback) => {
                const statusConfig = STATUS_CONFIG[feedback.status]
                const StatusIcon = statusConfig.icon
                return (
                  <div key={feedback.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{feedback.employee.user.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({feedback.employee.employeeCode})
                          </span>
                        </div>
                        {feedback.employee.department && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {feedback.employee.department.name}
                          </div>
                        )}
                      </div>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {format(new Date(feedback.createdAt), 'PPP')}
                    </p>
                    
                    <p className="whitespace-pre-wrap bg-muted/50 p-3 rounded">
                      {feedback.content}
                    </p>
                    
                    <div className="flex gap-2 mt-4">
                      {feedback.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: 'REVIEWED' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Mark as Reviewed
                        </Button>
                      )}
                      {feedback.status !== 'ACKNOWLEDGED' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: 'ACKNOWLEDGED' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

