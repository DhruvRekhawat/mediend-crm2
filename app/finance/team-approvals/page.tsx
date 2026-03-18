'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Check, LayoutGrid, LayoutList, Paperclip, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { BADGE_COUNTS_QUERY_KEY } from '@/hooks/use-badge-counts'
import { useIsMobile } from '@/hooks/use-mobile'
import { AttachmentCarousel } from '@/components/finance/attachment-carousel'
import { Skeleton } from '@/components/ui/skeleton'

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
  status: string
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

function PendingCard({
  req,
  onAck,
  isPending,
}: {
  req: MDApprovalRequest
  onAck: () => void
  isPending: boolean
}) {
  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{req.title}</h3>
          <span className="text-2xl font-bold text-indigo-600">
            {req.amount != null ? formatCurrency(req.amount) : '—'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
        <p className="text-sm">
          Requested by <strong>{req.requestedBy.name}</strong>
        </p>
        {req.respondedAt && (
          <p className="text-xs text-muted-foreground">
            MD approved {format(new Date(req.respondedAt), 'PPp')}
          </p>
        )}
        {req.responseNote && (
          <p className="text-sm bg-muted/50 p-2 rounded">MD note: {req.responseNote}</p>
        )}
        {req.attachments && req.attachments.length > 0 && (
          <AttachmentCarousel attachments={req.attachments} />
        )}
        <Button
          className="mt-4"
          onClick={onAck}
          disabled={isPending}
        >
          <Check className="h-4 w-4 mr-2" />
          Acknowledge
        </Button>
      </CardContent>
    </Card>
  )
}

function HistoryCard({ req }: { req: MDApprovalRequest }) {
  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-300">
            <CheckCircle className="h-3 w-3" />
            Finance Ack
          </Badge>
          <span className="text-sm text-muted-foreground">{format(new Date(req.createdAt), 'dd MMM yyyy')}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{req.title}</h3>
          <span className="font-medium text-indigo-600">
            {req.amount != null ? formatCurrency(req.amount) : '—'}
          </span>
        </div>
        {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
        {req.attachments && req.attachments.length > 0 && (
          <AttachmentCarousel attachments={req.attachments} />
        )}
        <p className="text-xs text-muted-foreground">Requested by {req.requestedBy.name}</p>
        {req.respondedAt && (
          <p className="text-xs text-muted-foreground">
            MD approved {format(new Date(req.respondedAt), 'dd MMM yyyy, HH:mm')}
          </p>
        )}
        {req.financeAcknowledgedAt && (
          <p className="text-xs text-muted-foreground">
            Acknowledged {format(new Date(req.financeAcknowledgedAt), 'dd MMM yyyy, HH:mm')}
            {req.financeAcknowledgedBy && ` by ${req.financeAcknowledgedBy.name}`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function PendingSkeleton() {
  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  )
}

export default function FinanceTeamApprovalsPage() {
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (isMobile) {
      setViewMode('grid')
    }
  }, [isMobile])

  const { data: pendingRequests = [], isLoading: isLoadingPending } = useQuery<MDApprovalRequest[]>({
    queryKey: ['md-approvals-finance'],
    queryFn: () => apiGet<MDApprovalRequest[]>('/api/md-approvals?financePending=true'),
  })

  const { data: historyRequests = [], isLoading: isLoadingHistory } = useQuery<MDApprovalRequest[]>({
    queryKey: ['md-approvals-finance-history'],
    queryFn: () => apiGet<MDApprovalRequest[]>('/api/md-approvals?financeHistory=true'),
  })

  const ackMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/md-approvals/${id}/finance-ack`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-approvals-finance', 'md-approvals-finance-history'] })
      queryClient.invalidateQueries({ queryKey: BADGE_COUNTS_QUERY_KEY })
      toast.success('Acknowledged')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Approvals</h1>
          <p className="text-muted-foreground mt-1">
            MD-approved requests with amounts. Acknowledge when you have noted them.
          </p>
        </div>
        {!isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <>
                <LayoutList className="h-4 w-4 mr-2" />
                Table View
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid View
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
            {historyRequests.length > 0 && (
              <span className="ml-2 text-muted-foreground text-sm">({historyRequests.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoadingPending ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <PendingSkeleton key={i} />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending acknowledgments</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>MD Approved</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.title}</div>
                          {req.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{req.requestedBy.name}</TableCell>
                      <TableCell className="font-semibold text-indigo-600">
                        {req.amount != null ? formatCurrency(req.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.respondedAt ? format(new Date(req.respondedAt), 'dd MMM yyyy, HH:mm') : '—'}
                      </TableCell>
                      <TableCell>
                        {req.attachments && req.attachments.length > 0 ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Paperclip className="h-4 w-4" />
                            <span>{req.attachments.length}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => ackMutation.mutate(req.id)}
                          disabled={ackMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((req) => (
                <PendingCard
                  key={req.id}
                  req={req}
                  onAck={() => ackMutation.mutate(req.id)}
                  isPending={ackMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {isLoadingHistory ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <PendingSkeleton key={i} />
              ))}
            </div>
          ) : historyRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No history yet</p>
              <p className="text-sm mt-1">Acknowledged requests will appear here</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>MD Approved</TableHead>
                    <TableHead>Acknowledged</TableHead>
                    <TableHead>Attachments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.title}</div>
                          {req.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{req.requestedBy.name}</TableCell>
                      <TableCell className="font-semibold text-indigo-600">
                        {req.amount != null ? formatCurrency(req.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.respondedAt ? format(new Date(req.respondedAt), 'dd MMM yyyy, HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.financeAcknowledgedAt
                          ? format(new Date(req.financeAcknowledgedAt), 'dd MMM yyyy, HH:mm')
                          : '—'}
                        {req.financeAcknowledgedBy && (
                          <div className="text-xs">by {req.financeAcknowledgedBy.name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.attachments && req.attachments.length > 0 ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Paperclip className="h-4 w-4" />
                            <span>{req.attachments.length}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyRequests.map((req) => (
                <HistoryCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
