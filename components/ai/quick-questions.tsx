'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const QUICK_QUESTIONS = [
  "What's the total revenue this month?",
  "Show me top performing BDs",
  "How many leads are in IPD stage?",
  "What's the conversion rate by source?",
  "List pending insurance cases",
  "Show outstanding payments summary",
]

interface QuickQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function QuickQuestions({ onSelect, disabled }: QuickQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 border-b">
      {QUICK_QUESTIONS.map((question, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(question)}
          disabled={disabled}
          className={cn(
            'text-xs h-auto py-1.5 px-3',
            'hover:bg-purple-50 hover:border-purple-300',
            'transition-colors'
          )}
        >
          {question}
        </Button>
      ))}
    </div>
  )
}
