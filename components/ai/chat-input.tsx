'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  disabled?: boolean
}

export function ChatInput({ onSubmit, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || disabled) return
    
    onSubmit(input.trim())
    setInput('')
  }

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your data..."
          disabled={isLoading || disabled}
          className={cn(
            'min-h-[60px] resize-none',
            'focus:ring-purple-500 focus:ring-2'
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className={cn(
            'bg-purple-600 hover:bg-purple-700',
            'text-white shrink-0'
          )}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
