'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { FileText, User } from 'lucide-react'
import { ChatMessageType } from '@prisma/client'

export interface ChatMessageData {
  id: string
  type: ChatMessageType
  content: string
  fileUrl: string | null
  fileName: string | null
  createdAt: string
  sender: { id: string; name: string; role: string } | null
}

interface ChatMessageProps {
  message: ChatMessageData
  currentUserId: string
}

export function ChatMessage({ message, currentUserId }: ChatMessageProps) {
  const isSystem = message.type === ChatMessageType.SYSTEM
  const isOwn = message.sender?.id === currentUserId
  const isFile = message.type === ChatMessageType.FILE

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground max-w-[85%] text-center">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[75%]',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <div className="text-xs font-medium opacity-90 mb-0.5">
          {message.sender?.name ?? 'Unknown'} · {message.sender?.role ?? ''}
        </div>
        {isFile && message.fileUrl && message.fileName ? (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm underline"
          >
            <FileText className="h-4 w-4" />
            {message.fileName}
          </a>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div className={cn('text-[10px] mt-1 opacity-80', isOwn && 'text-right')}>
          {format(new Date(message.createdAt), 'MMM d, HH:mm')}
        </div>
      </div>
    </div>
  )
}
