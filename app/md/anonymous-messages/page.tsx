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
      queryClient.invalidateQueries({ queryKey: ['badge-counts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const unreadCount = messages?.filter((m) => !m.isRead).length || 0

  return (
    <AuthenticatedLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Anonymous Messages</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Messages from employees with complete anonymity
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 w-fit">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-4 pb-3 md:pb-4">
              <div className="text-xl md:text-2xl font-bold">{messages?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Unread</CardTitle>
              <Mail className="h-4 w-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-4 pb-3 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{unreadCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 py-3 md:px-6 md:py-4">
            <CardTitle className="text-base md:text-lg">All Messages</CardTitle>
            <CardDescription className="text-sm">
              These messages are completely anonymous - no sender information is available
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
            {isLoading ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground text-sm">Loading...</div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border rounded-lg p-3 md:p-4 dark:border-border ${!msg.isRead ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-muted/30 dark:bg-muted/20'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {msg.isRead ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                        <span className="text-xs md:text-sm text-muted-foreground truncate">
                          {format(new Date(msg.createdAt), 'PPp')}
                        </span>
                      </div>
                      {!msg.isRead && (
                        <Badge variant="default" className="text-xs shrink-0">New</Badge>
                      )}
                    </div>
                    
                    <p className="whitespace-pre-wrap text-sm md:text-base bg-background dark:bg-muted/50 p-3 rounded border border-border text-foreground">
                      {msg.message}
                    </p>
                    
                    {!msg.isRead && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs md:text-sm"
                          onClick={() => markReadMutation.mutate(msg.id)}
                          disabled={markReadMutation.isPending}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base">No anonymous messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}

