'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { ShieldCheck, Send, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AnonymousMessagePage() {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: (message: string) => apiPost<{ id: string }>('/api/anonymous/message', { message }),
    onSuccess: () => {
      setMessage('')
      setSubmitted(true)
      toast.success('Message sent anonymously')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim().length < 10) {
      toast.error('Message must be at least 10 characters')
      return
    }
    submitMutation.mutate(message)
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Anonymous Message to MD</h1>
          <p className="text-muted-foreground mt-1">Your identity is completely protected</p>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Message Sent Successfully</h2>
            <p className="text-muted-foreground mb-6">
              Your anonymous message has been delivered to the Managing Director.
              <br />
              Your identity has not been recorded.
            </p>
            <Button onClick={() => setSubmitted(false)}>
              Send Another Message
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anonymous Message to MD</h1>
        <p className="text-muted-foreground mt-1">Your identity is completely protected</p>
      </div>

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
            Complete Anonymity Guaranteed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="text-sm space-y-1">
            <li>• Your identity is NOT stored with this message</li>
            <li>• No IP address, device info, or login details are recorded</li>
            <li>• Only the message content reaches the MD</li>
            <li>• Feel free to share concerns, suggestions, or feedback</li>
          </ul>
        </CardContent>
      </Card>

      {/* Message Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Write Your Message</CardTitle>
          <CardDescription>
            Share your thoughts, concerns, or suggestions with the Managing Director
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here... Be as detailed as you need to be."
                rows={8}
                className="mt-2"
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Minimum 10 characters</span>
                <span>{message.length}/2000</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Once sent, you cannot edit or delete this message. Please review before submitting.
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={submitMutation.isPending || message.length < 10}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? 'Sending...' : 'Send Anonymous Message'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

