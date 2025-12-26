'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { MessageSquare, Mail, MailOpen, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AnonymousMessage {
  id: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function MDAnonymousMessagesPage() {
  const queryClient = useQueryClient()

  const { data: messages, isLoading } = useQuery<AnonymousMessage[]>({
    queryKey: ['anonymous-messages'],
    queryFn: () => apiGet<AnonymousMessage[]>('/api/md/anonymous-messages'),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiPatch<AnonymousMessage>(`/api/md/anonymous-messages?id=${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-messages'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const unreadCount = messages?.filter((m) => !m.isRead).length || 0

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Anonymous Messages</h1>
            <p className="text-muted-foreground mt-1">
              Messages from employees with complete anonymity
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
            <CardDescription>
              These messages are completely anonymous - no sender information is available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border rounded-lg p-4 ${!msg.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {msg.isRead ? (
                          <MailOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Mail className="h-5 w-5 text-blue-600" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(msg.createdAt), 'PPP p')}
                        </span>
                      </div>
                      {!msg.isRead && (
                        <Badge variant="default">New</Badge>
                      )}
                    </div>
                    
                    <p className="whitespace-pre-wrap bg-white p-4 rounded border">
                      {msg.message}
                    </p>
                    
                    {!msg.isRead && (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markReadMutation.mutate(msg.id)}
                          disabled={markReadMutation.isPending}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No anonymous messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}

