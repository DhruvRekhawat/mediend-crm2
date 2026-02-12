'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversation {
  leadId: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  caseStage: string
  latestMessage: {
    id: string
    content: string
    type: string
    createdAt: Date
    sender: {
      id: string
      name: string
      role: string
    } | null
  } | null
  unreadCount: number
  totalMessages: number
  updatedAt: Date
}

interface ChatListProps {
  selectedLeadId?: string
}

export function ChatList({ selectedLeadId }: ChatListProps) {
  const router = useRouter()

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const res = await apiGet<Conversation[]>('/api/chat/conversations')
      // Convert date strings to Date objects
      return res.map((conv) => ({
        ...conv,
        latestMessage: conv.latestMessage
          ? {
              ...conv.latestMessage,
              createdAt: new Date(conv.latestMessage.createdAt),
            }
          : null,
        updatedAt: new Date(conv.updatedAt),
      }))
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {conversations.map((conversation) => {
        const isSelected = selectedLeadId === conversation.leadId
        const preview = conversation.latestMessage
          ? conversation.latestMessage.content.substring(0, 50) + (conversation.latestMessage.content.length > 50 ? '...' : '')
          : 'No messages yet'

        return (
          <button
            key={conversation.leadId}
            onClick={() => {
              router.push(`/chat/${conversation.leadId}`)
              router.refresh()
            }}
            className={cn(
              'w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors',
              isSelected && 'bg-blue-50 dark:bg-blue-950/30 border-r-2 border-blue-600'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {conversation.patientName}
                  </h3>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                  {conversation.leadRef} • {conversation.city}
                </p>
                {conversation.latestMessage && (
                  <div className="flex items-center gap-2 mt-1">
                    <MessageSquare className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {conversation.latestMessage.sender?.name || 'System'}: {preview}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-xs text-gray-400">
                {conversation.latestMessage
                  ? formatDistanceToNow(conversation.latestMessage.createdAt, { addSuffix: true })
                  : formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
