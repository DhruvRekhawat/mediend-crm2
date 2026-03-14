'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import { useQuery as usePermissionQuery } from '@tanstack/react-query'
import { Check, X, ChevronLeft, ChevronRight, Plus, CheckCircle, Clock, Paperclip } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSwipeable } from 'react-swipeable'
import confetti from 'canvas-confetti'
import { AttachmentCarousel } from '@/components/finance/attachment-carousel'

interface Attachment {
  name: string
  url: string
  type: string
}

interface MDApprovalRequest {
  id: string
  title: string
  description: string | null
  amount: number | null
  attachments?: Attachment[] | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedById: string
  requestedBy: { id: string; name: string; email: string }
  respondedBy?: { id: string; name: string } | null
  responseNote: string | null
  respondedAt: string | null
  financeAcknowledged: boolean
  financeAcknowledgedBy?: { id: string; name: string } | null
  financeAcknowledgedAt: string | null
  createdAt: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function SwipeCard({
  request,
  onApprove,
  onReject,
}: {
  request: MDApprovalRequest
  onApprove: () => void
  onReject: () => void
}) {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setSwipeOffset(eventData.deltaX)
      if (eventData.deltaX > 50) setSwipeDirection('right')
      else if (eventData.deltaX < -50) setSwipeDirection('left')
      else setSwipeDirection(null)
    },
    onSwiped: (eventData) => {
      if (eventData.deltaX > 100) onApprove()
      else if (eventData.deltaX < -100) onReject()
      setSwipeOffset(0)
      setSwipeDirection(null)
    },
    trackMouse: true,
  })

  const bg =
    swipeDirection === 'right'
      ? 'bg-indigo-100 dark:bg-indigo-900/20'
      : swipeDirection === 'left'
      ? 'bg-red-100 dark:bg-red-900/20'
      : 'bg-white dark:bg-slate-800'

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-16 bg-indigo-500/20 flex items-center justify-center">
        <ChevronRight className={`h-8 w-8 text-indigo-600 transition-opacity ${swipeDirection === 'right' ? 'opacity-100' : 'opacity-30'}`} />
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-red-500/20 flex items-center justify-center">
        <ChevronLeft className={`h-8 w-8 text-red-600 transition-opacity ${swipeDirection === 'left' ? 'opacity-100' : 'opacity-30'}`} />
      </div>

      <div {...handlers} className={`transition-all duration-200 ${bg}`} style={{ transform: `translateX(${swipeOffset}px)` }}>
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 cursor-grab active:cursor-grabbing">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Pending
              </Badge>
              <span className="text-sm text-muted-foreground">{format(new Date(request.createdAt), 'dd MMM yyyy')}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <h3 className="font-semibold text-lg">{request.title}</h3>
            {request.description && <p className="text-sm text-muted-foreground">{request.description}</p>}
            {request.amount != null && (
              <div className="text-xl font-bold text-indigo-600">{formatCurrency(request.amount)}</div>
            )}
            {request.attachments && request.attachments.length > 0 && (
              <AttachmentCarousel attachments={request.attachments} />
            )}
            <div className="text-sm text-muted-foreground">Requested by {request.requestedBy.name}</div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="destructive" className="flex-1" onClick={onReject}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={onApprove}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Swipe right to approve • Swipe left to reject</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HistoryCard({ request }: { request: MDApprovalRequest }) {
  const isApproved = request.status === 'APPROVED'
  const needsFinanceAck = isApproved && request.amount != null && !request.financeAcknowledged

  return (
    <Card
      className={`border-2 ${
        isApproved
          ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-800'
          : 'border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge className={isApproved ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'}>
              {isApproved ? 'Approved' : 'Rejected'}
            </Badge>
            {needsFinanceAck && (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-300">
                <Clock className="h-3 w-3" />
                Awaiting Finance
              </Badge>
            )}
            {isApproved && request.amount != null && request.financeAcknowledged && (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-300">
                <CheckCircle className="h-3 w-3" />
                Finance Ack
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{format(new Date(request.createdAt), 'dd MMM yyyy')}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <h3 className="font-semibold">{request.title}</h3>
        {request.description && <p className="text-sm text-muted-foreground">{request.description}</p>}
        {request.amount != null && <div className="font-medium text-indigo-600">{formatCurrency(request.amount)}</div>}
        {request.attachments && request.attachments.length > 0 && (
          <AttachmentCarousel attachments={request.attachments} />
        )}
        <p className="text-xs text-muted-foreground">Requested by {request.requestedBy.name}</p>
      </CardContent>
    </Card>
  )
}

export default function MDApprovalsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [requestOpen, setRequestOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MDApprovalRequest | null>(null)
  const [responseNote, setResponseNote] = useState('')

  const isMD = user?.role === 'MD' || user?.role === 'ADMIN'

  const { data: canRequest } = usePermissionQuery({
    queryKey: ['permission-md-approval-request'],
    queryFn: () => apiGet<{ allowed: boolean }>('/api/permissions/check?feature=md_approval_request'),
  })

  const { data: requests = [], isLoading } = useQuery<MDApprovalRequest[]>({
    queryKey: ['md-approvals'],
    queryFn: () => apiGet<MDApprovalRequest[]>('/api/md-approvals'),
  })

  const pending = requests.filter((r) => r.status === 'PENDING')
  const history = requests.filter((r) => r.status !== 'PENDING')

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiPatch(`/api/md-approvals/${id}`, { status: 'APPROVED', responseNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-approvals', 'badge-counts'] })
      setApproveDialogOpen(false)
      setSelectedRequest(null)
      setResponseNote('')
      confetti({ particleCount: 80, spread: 60 })
      toast.success('Approved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiPatch(`/api/md-approvals/${id}`, { status: 'REJECTED', responseNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-approvals', 'badge-counts'] })
      setRejectDialogOpen(false)
      setSelectedRequest(null)
      setResponseNote('')
      toast.success('Rejected')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; amount?: number; attachments?: Attachment[] }) =>
      apiPost('/api/md-approvals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-approvals', 'badge-counts'] })
      setRequestOpen(false)
      setTitle('')
      setDescription('')
      setAmount('')
      setAttachments([])
      toast.success('Request submitted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate({ id: selectedRequest.id, note: responseNote || undefined })
    }
  }

  const handleReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({ id: selectedRequest.id, note: responseNote || undefined })
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingFiles(true)
    try {
      const newAttachments: Attachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/md-approvals/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        newAttachments.push({
          name: file.name,
          url: data.data.url,
          type: file.type,
        })
      }
      setAttachments((prev) => [...prev, ...newAttachments])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingFiles(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MD Team Approvals</h1>
        {canRequest?.allowed && !isMD && (
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Approval
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request MD Approval</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Request title" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={3} />
                </div>
                <div>
                  <Label>Amount (optional)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Attachments (optional)</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    disabled={uploadingFiles}
                    className="cursor-pointer"
                  />
                  {uploadingFiles && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4" />
                          <span className="truncate flex-1">{a.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-destructive"
                            onClick={() => removeAttachment(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((req) => (
                <SwipeCard
                  key={req.id}
                  request={req}
                  onApprove={() => {
                    setSelectedRequest(req)
                    setApproveDialogOpen(true)
                  }}
                  onReject={() => {
                    setSelectedRequest(req)
                    setRejectDialogOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No history yet</div>
          ) : (
            <div className="space-y-4">
              {history.map((req) => (
                <HistoryCard key={req.id} request={req} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="font-medium">{selectedRequest.title}</p>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleApprove} disabled={approveMutation.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Confirm Approve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="font-medium">{selectedRequest.title}</p>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={2} />
              </div>
              <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending} className="w-full">
                Confirm Reject
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
