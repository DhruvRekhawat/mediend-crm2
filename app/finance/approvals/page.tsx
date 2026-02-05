'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Check, X, ArrowDownCircle, AlertTriangle, Clock, Edit, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import { useSwipeable } from 'react-swipeable'
import confetti from 'canvas-confetti'
import { useIsMobile } from '@/hooks/use-mobile'

interface LedgerEntry {
  id: string
  serialNumber: string
  transactionType: 'CREDIT' | 'DEBIT'
  transactionDate: string
  description: string
  paymentAmount: number | null
  receivedAmount: number | null
  openingBalance: number
  currentBalance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  editRequestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  editRequestReason: string | null
  editRequestData: Record<string, unknown> | null
  editRequestedAt: string | null
  editRequestedBy: {
    id: string
    name: string
    email: string
  } | null
  party: {
    id: string
    name: string
    partyType: string
  }
  head: {
    id: string
    name: string
  }
  paymentType: {
    id: string
    name: string
    paymentType: string
  }
  paymentMode: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface LedgerResponse {
  data: LedgerEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const UNDO_DURATION_MS = 2 * 60 * 1000 // 2 minutes

function ApprovalUndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const remainingPercent = Math.max(0, 1 - elapsed / UNDO_DURATION_MS) * 100

  return (
    <div className="relative w-[420px] overflow-hidden rounded-lg border-0 bg-green-600 px-4 py-3 shadow-lg">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Dismiss"
      >
        <XCircle className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-4 pr-8">
        <p className="text-sm font-medium text-white">{message}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
            onUndo()
          }}
          className="shrink-0 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/30"
        >
          Undo
        </button>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white/90 transition-all duration-75 ease-linear"
          style={{ width: `${remainingPercent}%` }}
        />
      </div>
    </div>
  )
}

interface SwipeCardProps {
  entry: LedgerEntry
  onApprove: () => void
  onReject: () => void
}

function SwipeCard({ entry, onApprove, onReject }: SwipeCardProps) {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setSwipeOffset(eventData.deltaX)
      if (eventData.deltaX > 50) {
        setSwipeDirection('right')
      } else if (eventData.deltaX < -50) {
        setSwipeDirection('left')
      } else {
        setSwipeDirection(null)
      }
    },
    onSwiped: (eventData) => {
      if (eventData.deltaX > 100) {
        onApprove()
      } else if (eventData.deltaX < -100) {
        onReject()
      }
      setSwipeOffset(0)
      setSwipeDirection(null)
    },
    trackMouse: true,
  })

  const backgroundColor =
    swipeDirection === 'right'
      ? 'bg-green-100 dark:bg-green-900/20'
      : swipeDirection === 'left'
      ? 'bg-red-100 dark:bg-red-900/20'
      : 'bg-white dark:bg-slate-800'

  return (
    <div className="relative overflow-hidden">
      {/* Swipe hints */}
      <div className="absolute inset-y-0 left-0 w-16 bg-green-500/20 flex items-center justify-center">
        <ChevronRight className={`h-8 w-8 text-green-600 transition-opacity ${swipeDirection === 'right' ? 'opacity-100' : 'opacity-30'}`} />
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-red-500/20 flex items-center justify-center">
        <ChevronLeft className={`h-8 w-8 text-red-600 transition-opacity ${swipeDirection === 'left' ? 'opacity-100' : 'opacity-30'}`} />
      </div>

      <div
        {...handlers}
        className={`transition-all duration-200 ${backgroundColor}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        <Card className="border-2 cursor-grab active:cursor-grabbing">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-mono">
                {entry.serialNumber}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(entry.transactionDate), 'dd MMM yyyy')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-semibold text-lg">{entry.party.name}</div>
              <div className="text-xs text-muted-foreground">{entry.party.partyType}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Description</div>
              <div className="text-sm break-words">{entry.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Head</div>
                <div className="font-medium">{entry.head.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Payment Mode</div>
                <Badge variant="outline">{entry.paymentMode.name}</Badge>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Created by</div>
                  <div className="text-sm">{entry.createdBy.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    -{formatCurrency(entry.paymentAmount || 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject()
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove()
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground mt-2">
              Swipe right to approve • Swipe left to reject
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const isMobile = useIsMobile()
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalReason, setApprovalReason] = useState('')
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve')
  const [dialogType, setDialogType] = useState<'debit' | 'edit'>('debit')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const previousPendingCountRef = useRef(0)

  const queryClient = useQueryClient()

  // Auto-set view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode('cards')
    } else {
      setViewMode('table')
    }
  }, [isMobile])

  // Fetch pending debit entries
  const { data: pendingData, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['pending-debits'],
    queryFn: () => apiGet<LedgerResponse>('/api/finance/ledger?status=PENDING&transactionType=DEBIT&limit=1000'),
  })

  // Fetch pending edit requests
  const { data: editRequestsData, isLoading: isLoadingEdits } = useQuery<LedgerResponse>({
    queryKey: ['pending-edit-requests'],
    queryFn: () => apiGet<LedgerResponse>('/api/finance/ledger?editRequestStatus=PENDING&status=APPROVED&limit=1000'),
  })

  const triggerConfetti = () => {
    const end = Date.now() + 3 * 1000 // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

    const frame = () => {
      if (Date.now() > end) return

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      })

      requestAnimationFrame(frame)
    }

    frame()
  }

  const approveMutation = useMutation({
    mutationFn: async ({ id, action, rejectionReason }: { id: string; action: 'approve' | 'reject'; rejectionReason?: string }) => {
      return apiPost(`/api/finance/ledger/${id}/approve`, { action, rejectionReason })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-debits'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['payment-modes'] })
      setIsDialogOpen(false)
      setSelectedEntry(null)
      setRejectionReason('')

      const message = variables.action === 'approve'
        ? 'Debit entry approved! Balance has been updated.'
        : 'Debit entry rejected.'

      toast.custom(
        (toastId) => (
          <ApprovalUndoToast
            message={message}
            onUndo={() => undoMutation.mutate(variables.id)}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: 120000 }
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process approval')
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ ids, action, rejectionReason }: { ids: string[]; action: 'approve' | 'reject'; rejectionReason?: string }) => {
      return apiPost('/api/finance/ledger/bulk-approve', { ids, action, rejectionReason })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-debits'] })
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['payment-modes'] })
      setSelectedIds(new Set())
      setIsDialogOpen(false)
      setRejectionReason('')
      
      if (variables.action === 'approve') {
        toast.success(`${variables.ids.length} entries approved successfully!`)
      } else {
        toast.success(`${variables.ids.length} entries rejected.`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process bulk approval')
    },
  })

  const approveEditMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiPost(`/api/finance/ledger/${id}/approve-edit`, { reason })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setIsDialogOpen(false)
      setSelectedEntry(null)
      setApprovalReason('')
      toast.custom(
        (toastId) => (
          <ApprovalUndoToast
            message="Edit request approved"
            onUndo={() => undoMutation.mutate(variables.id)}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: 120000 }
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve edit request')
    },
  })

  const rejectEditMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiPost(`/api/finance/ledger/${id}/reject-edit`, { reason })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setIsDialogOpen(false)
      setSelectedEntry(null)
      setRejectionReason('')
      toast.custom(
        (toastId) => (
          <ApprovalUndoToast
            message="Edit request rejected"
            onUndo={() => undoMutation.mutate(variables.id)}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: 120000 }
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject edit request')
    },
  })

  const undoMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/finance/ledger/${id}/undo`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-debits'] })
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['payment-modes'] })
      toast.success('Action undone')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to undo')
    },
  })

  const handleApprove = (entry: LedgerEntry, type: 'debit' | 'edit' = 'debit') => {
    setSelectedEntry(entry)
    setDialogAction('approve')
    setDialogType(type)
    setIsDialogOpen(true)
  }

  const handleReject = (entry: LedgerEntry, type: 'debit' | 'edit' = 'debit') => {
    setSelectedEntry(entry)
    setDialogAction('reject')
    setDialogType(type)
    setRejectionReason('')
    setApprovalReason('')
    setIsDialogOpen(true)
  }

  const handleConfirm = () => {
    // Handle bulk rejection
    if (!selectedEntry && selectedIds.size > 0 && dialogAction === 'reject') {
      handleConfirmBulkReject()
      return
    }

    if (!selectedEntry) return

    if (dialogType === 'debit') {
      if (dialogAction === 'reject' && !rejectionReason.trim()) {
        toast.error('Rejection reason is required')
        return
      }

      approveMutation.mutate({
        id: selectedEntry.id,
        action: dialogAction,
        rejectionReason: dialogAction === 'reject' ? rejectionReason.trim() : undefined,
      })
    } else {
      // Edit request
      if (dialogAction === 'approve') {
        if (!approvalReason.trim()) {
          toast.error('Approval reason is required')
          return
        }
        approveEditMutation.mutate({
          id: selectedEntry.id,
          reason: approvalReason.trim(),
        })
      } else {
        if (!rejectionReason.trim()) {
          toast.error('Rejection reason is required')
          return
        }
        rejectEditMutation.mutate({
          id: selectedEntry.id,
          reason: rejectionReason.trim(),
        })
      }
    }
  }

  const pendingCount = pendingData?.pagination.total || 0
  const totalPendingAmount = pendingData?.data.reduce((sum, e) => sum + (e.paymentAmount || 0), 0) || 0
  const editRequestsCount = editRequestsData?.pagination.total || 0

  // Trigger confetti when all approvals are done
  useEffect(() => {
    if (previousPendingCountRef.current > 0 && pendingCount === 0) {
      triggerConfetti()
    }
    previousPendingCountRef.current = pendingCount
  }, [pendingCount])

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return
    bulkApproveMutation.mutate({
      ids: Array.from(selectedIds),
      action: 'approve',
    })
  }

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return
    setDialogAction('reject')
    setDialogType('debit')
    setIsDialogOpen(true)
  }

  const handleConfirmBulkReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }
    bulkApproveMutation.mutate({
      ids: Array.from(selectedIds),
      action: 'reject',
      rejectionReason: rejectionReason.trim(),
    })
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingData?.data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingData?.data.map((e) => e.id) || []))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve pending transactions and edit requests</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
        >
          {viewMode === 'table' ? (
            <>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Card View
            </>
          ) : (
            <>
              <LayoutList className="h-4 w-4 mr-2" />
              Table View
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="debits" className="space-y-6">
        <TabsList>
          <TabsTrigger value="debits">
            Debit Approvals
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="edits">
            Edit Requests
            {editRequestsCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {editRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debits" className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Pending Approvals</p>
                    <p className="text-3xl font-bold">{pendingCount}</p>
                  </div>
                  <Clock className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">Total Pending Amount</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalPendingAmount)}</p>
                  </div>
                  <ArrowDownCircle className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert for MD */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Important</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Only debit (outgoing) transactions require your approval. Credit transactions are auto-approved.
                    When you approve a debit, the amount will be deducted from the payment mode balance immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Action Bar */}
          {viewMode === 'table' && selectedIds.size > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{selectedIds.size} selected</span>
                    <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkReject}
                      disabled={bulkApproveMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject Selected ({selectedIds.size})
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleBulkApprove}
                      disabled={bulkApproveMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve Selected ({selectedIds.size})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Entries Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Debit Entries</CardTitle>
          <CardDescription>Review each entry and approve or reject</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pendingCount === 0 ? (
            <div className="text-center py-12">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">No pending debit entries to approve.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-4">
              {pendingData?.data.map((entry) => (
                <SwipeCard
                  key={entry.id}
                  entry={entry}
                  onApprove={() => handleApprove(entry, 'debit')}
                  onReject={() => handleReject(entry, 'debit')}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === pendingData?.data.length && pendingData?.data.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingData?.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(entry.transactionDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.party.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.party.partyType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>{entry.head.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.paymentMode.name}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-red-600">
                      -{formatCurrency(entry.paymentAmount || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{entry.createdBy.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(entry, 'debit')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(entry, 'debit')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="edits" className="space-y-6">
          {/* Edit Requests Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending Edit Requests</p>
                    <p className="text-3xl font-bold">{editRequestsCount}</p>
                  </div>
                  <Edit className="h-10 w-10 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Edit Requests</CardTitle>
              <CardDescription>Review and approve/reject edit requests from finance team</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEdits ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : editRequestsCount === 0 ? (
                <div className="text-center py-12">
                  <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-muted-foreground">No pending edit requests to review.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Request Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRequestsData?.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.transactionDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.party.name}</div>
                            <div className="text-xs text-muted-foreground">{entry.party.partyType}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {entry.editRequestedBy?.name || 'Unknown'}
                            {entry.editRequestedAt && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(entry.editRequestedAt), 'dd MMM yyyy')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate">{entry.editRequestReason || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(entry, 'edit')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(entry, 'edit')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Link href={`/finance/ledger/${entry.id}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setSelectedEntry(null)
          setRejectionReason('')
          setApprovalReason('')
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {!selectedEntry && selectedIds.size > 0
                ? `Reject ${selectedIds.size} Entries`
                : dialogType === 'edit' 
                ? (dialogAction === 'approve' ? 'Approve Edit Request' : 'Reject Edit Request')
                : (dialogAction === 'approve' ? 'Confirm Approval' : 'Reject Entry')}
            </DialogTitle>
            <DialogDescription>
              {!selectedEntry && selectedIds.size > 0
                ? `You are about to reject ${selectedIds.size} entries. Please provide a reason.`
                : dialogType === 'edit'
                ? (dialogAction === 'approve'
                    ? 'Review the requested changes and provide an approval reason.'
                    : 'Please provide a reason for rejecting this edit request.')
                : (dialogAction === 'approve'
                    ? 'Are you sure you want to approve this debit entry?'
                    : 'Please provide a reason for rejection.')}
            </DialogDescription>
          </DialogHeader>

          {!selectedEntry && selectedIds.size > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Entries: {selectedIds.size}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkRejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="bulkRejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting these entries..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setRejectionReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={bulkApproveMutation.isPending}
                  variant="destructive"
                >
                  {bulkApproveMutation.isPending ? 'Processing...' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          ) : selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serial Number</span>
                  <Link href={`/finance/ledger/${selectedEntry.id}`} className="font-mono font-medium hover:underline">
                    {selectedEntry.serialNumber}
                  </Link>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Party</span>
                  <span>{selectedEntry.party.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-right max-w-[200px] truncate">{selectedEntry.description}</span>
                </div>
                {dialogType === 'debit' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Mode</span>
                      <span>{selectedEntry.paymentMode.name}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Amount</span>
                      <span className="text-red-600">-{formatCurrency(selectedEntry.paymentAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {dialogType === 'edit' && selectedEntry.editRequestData && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <p className="text-sm font-medium mb-2">Requested Changes:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedEntry.editRequestData, null, 2)}
                  </pre>
                </div>
              )}

              {dialogType === 'edit' && selectedEntry.editRequestReason && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Request Reason:</p>
                  <p className="text-sm">{selectedEntry.editRequestReason}</p>
                </div>
              )}

              {dialogAction === 'approve' && dialogType === 'debit' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Balance Impact:</strong> This amount will be deducted from{' '}
                    <strong>{selectedEntry.paymentMode.name}</strong> immediately upon approval.
                  </p>
                </div>
              )}

              {dialogAction === 'approve' && dialogType === 'edit' && (
                <div className="space-y-2">
                  <Label htmlFor="approvalReason">Approval Reason *</Label>
                  <Textarea
                    id="approvalReason"
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    placeholder="Explain why you are approving this edit request..."
                    rows={3}
                    required
                  />
                </div>
              )}

              {dialogAction === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={dialogType === 'edit' ? 'Explain why you are rejecting this edit request...' : 'Please provide a reason for rejection...'}
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedEntry(null)
                    setRejectionReason('')
                    setApprovalReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={approveMutation.isPending || approveEditMutation.isPending || rejectEditMutation.isPending}
                  className={dialogAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  variant={dialogAction === 'reject' ? 'destructive' : 'default'}
                >
                  {(approveMutation.isPending || approveEditMutation.isPending || rejectEditMutation.isPending)
                    ? 'Processing...'
                    : dialogAction === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

