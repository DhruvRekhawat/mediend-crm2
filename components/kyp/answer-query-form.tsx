'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AnswerQueryFormProps {
  queryId: string
  onSuccess?: () => void
}

export function AnswerQueryForm({ queryId, onSuccess }: AnswerQueryFormProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) {
      toast.error('Please enter an answer')
      return
    }

    setSubmitting(true)
    try {
      await apiPost(`/api/kyp/queries/${queryId}/answer`, {
        answer: answer.trim(),
      })

      toast.success('Answer submitted successfully')
      setAnswer('')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="answer">Your Answer</Label>
        <Textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer to the query..."
          rows={4}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={submitting || !answer.trim()}>
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </Button>
    </form>
  )
}
