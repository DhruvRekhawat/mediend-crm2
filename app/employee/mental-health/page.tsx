'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { Heart, Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface MentalHealthRequest {
  id: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  hrResponse: string | null
  respondedAt: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
}

export default function EmployeeMentalHealthPage() {
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery<MentalHealthRequest[]>({
    queryKey: ['my-mental-health'],
    queryFn: () => apiGet<MentalHealthRequest[]>('/api/employee/mental-health'),
  })

  const submitMutation = useMutation({
    mutationFn: (reason?: string) =>
      apiPost<MentalHealthRequest>('/api/employee/mental-health', { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mental-health'] })
      setReason('')
      toast.success('Request submitted. HR will respond within 48 hours.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit request')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate(reason || undefined)
  }

  const hasPendingRequest = requests?.some((r) => r.status === 'PENDING')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mental Health Support</h1>
        <p className="text-muted-foreground mt-1">Request support from HR - Response within 48 hours</p>
      </div>

      {/* Support Info */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Heart className="h-5 w-5" />
            We Care About Your Well-being
          </CardTitle>
        </CardHeader>
        <CardContent className="text-purple-700">
          <ul className="text-sm space-y-1">
            <li>• Your mental health is our priority</li>
            <li>• All requests are handled with complete confidentiality</li>
            <li>• HR will respond within 48 hours</li>
            <li>• You can share details privately or just request support</li>
          </ul>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Support</CardTitle>
          <CardDescription>
            Submit a request for mental health support
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPendingRequest ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-700">
                You have a pending request. HR will respond within 48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reason">Details (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="You can share what you're going through, or simply request support without details..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is optional - you can request support without sharing details
                </p>
              </div>

              <Button type="submit" disabled={submitMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Submitting...' : 'Request Support'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Track the status of your support requests</CardDescription>
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
                      <p className="text-sm text-muted-foreground">
                        Submitted on {format(new Date(request.createdAt), 'PPP')}
                      </p>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {request.reason && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Your message:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded">{request.reason}</p>
                      </div>
                    )}

                    {request.hrResponse && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-700">HR Response:</p>
                        <p className="text-sm text-green-600">{request.hrResponse}</p>
                        {request.respondedAt && (
                          <p className="text-xs text-green-500 mt-2">
                            Responded on {format(new Date(request.respondedAt), 'PPP')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

