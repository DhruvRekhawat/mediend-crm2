'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { MessageSquare, Send, Clock, CheckCircle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Feedback {
  id: string
  content: string
  status: 'PENDING' | 'REVIEWED' | 'ACKNOWLEDGED'
  createdAt: string
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  REVIEWED: { label: 'Reviewed', variant: 'default' as const, icon: Eye },
  ACKNOWLEDGED: { label: 'Acknowledged', variant: 'default' as const, icon: CheckCircle },
}

export default function EmployeeFeedbackPage() {
  const [content, setContent] = useState('')
  const queryClient = useQueryClient()

  const { data: feedbacks, isLoading } = useQuery<Feedback[]>({
    queryKey: ['my-feedback'],
    queryFn: () => apiGet<Feedback[]>('/api/employee/feedback'),
  })

  const submitMutation = useMutation({
    mutationFn: (content: string) => apiPost<Feedback>('/api/employee/feedback', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] })
      setContent('')
      toast.success('Feedback submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit feedback')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim().length < 10) {
      toast.error('Feedback must be at least 10 characters')
      return
    }
    submitMutation.mutate(content)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feedback 360</h1>
        <p className="text-muted-foreground mt-1">Share your feedback with HR</p>
      </div>

      {/* Submit Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Submit Feedback
          </CardTitle>
          <CardDescription>
            Your feedback helps us improve. Share your thoughts, suggestions, or concerns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, suggestions, or concerns..."
                rows={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 10 characters required
              </p>
            </div>
            <Button type="submit" disabled={submitMutation.isPending || content.length < 10}>
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submitted Feedback</CardTitle>
          <CardDescription>Track the status of your feedback</CardDescription>
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(feedback.createdAt), 'PPP')}
                        </p>
                        <p className="whitespace-pre-wrap">{feedback.content}</p>
                      </div>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback submitted yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

