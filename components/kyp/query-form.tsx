'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface QueryFormProps {
  preAuthorizationId: string
  onSuccess?: () => void
}

export function QueryForm({ preAuthorizationId, onSuccess }: QueryFormProps) {
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      toast.error('Please enter a question')
      return
    }

    setSubmitting(true)
    try {
      await apiPost('/api/kyp/queries', {
        preAuthorizationId,
        question: question.trim(),
      })

      toast.success('Query raised successfully')
      setQuestion('')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to raise query')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question for the BD team..."
          rows={4}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={submitting || !question.trim()}>
        {submitting ? 'Raising Query...' : 'Raise Query'}
      </Button>
    </form>
  )
}
