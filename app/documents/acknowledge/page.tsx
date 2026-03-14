'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, FileText, Loader2 } from 'lucide-react'

interface AckSummary {
  documentType: string
  documentTypeLabel: string
  employeeName: string
  companyName: string
  generatedAtFormatted: string
  acknowledgedAt: string | null
  acknowledgedAtFormatted: string | null
}

async function fetchAckSummary(token: string): Promise<AckSummary> {
  const res = await fetch(`/api/documents/acknowledge?token=${encodeURIComponent(token)}`)
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to load document')
  }
  return json.data
}

async function postAcknowledge(token: string): Promise<{ acknowledgedAtFormatted: string }> {
  const res = await fetch('/api/documents/acknowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to acknowledge')
  }
  return json.data
}

function DocumentAcknowledgeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const queryClient = useQueryClient()
  const [acknowledged, setAcknowledged] = useState(false)

  const { data, isLoading, error } = useQuery<AckSummary>({
    queryKey: ['document-ack', token],
    queryFn: () => fetchAckSummary(token!),
    enabled: !!token,
  })

  const ackMutation = useMutation({
    mutationFn: () => postAcknowledge(token!),
    onSuccess: (result) => {
      setAcknowledged(true)
      queryClient.invalidateQueries({ queryKey: ['document-ack', token] })
    },
  })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This acknowledgement link is invalid or missing. Please use the link from your email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'This link may have expired or is invalid.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const ackDate = acknowledged
    ? (ackMutation.data as { acknowledgedAtFormatted?: string } | undefined)?.acknowledgedAtFormatted
    : data?.acknowledgedAtFormatted

  if (data?.acknowledgedAt || acknowledged) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
              <CardTitle>Already Acknowledged</CardTitle>
            </div>
            <CardDescription>
              This document was acknowledged on {ackDate ?? 'previously'}. Thank you.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle>Document Acknowledgement</CardTitle>
          </div>
          <CardDescription>
            Please review the document summary below and confirm your acceptance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Document</span>
              <span className="font-medium">{data?.documentTypeLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium">{data?.employeeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{data?.companyName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{data?.generatedAtFormatted}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            By clicking below, you acknowledge that you have received and accept the terms of this document.
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => ackMutation.mutate()}
            disabled={ackMutation.isPending}
          >
            {ackMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                I Acknowledge & Accept
              </>
            )}
          </Button>
          {ackMutation.isError && (
            <p className="text-sm text-destructive">{ackMutation.error?.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DocumentAcknowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <DocumentAcknowledgeContent />
    </Suspense>
  )
}
