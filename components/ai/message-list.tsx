'use client'

import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'
import { TypingIndicator } from './typing-indicator'

export interface ChatMessage {
  id: string
  role: string
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Bot className="h-12 w-12 text-purple-400 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Ask me anything about your dashboard data!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
          )}
          
          <div
            className={cn(
              'max-w-[80%] rounded-lg px-4 py-2',
              message.role === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-muted text-foreground'
            )}
          >
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
            </div>
          )}
        </div>
      ))}
      
      {isLoading && <TypingIndicator />}
    </div>
  )
}
