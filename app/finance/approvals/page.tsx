'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Check, X, ArrowDownCircle, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

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
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ApprovalsPage() {
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve')

  const queryClient = useQueryClient()

  // Fetch pending debit entries
  const { data: pendingData, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['pending-debits'],
    queryFn: () => apiGet<LedgerResponse>('/api/finance/ledger?status=PENDING&transactionType=DEBIT'),
  })

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
      
      if (variables.action === 'approve') {
        toast.success('Debit entry approved! Balance has been updated.')
      } else {
        toast.success('Debit entry rejected.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process approval')
    },
  })

  const handleApprove = (entry: LedgerEntry) => {
    setSelectedEntry(entry)
    setDialogAction('approve')
    setIsDialogOpen(true)
  }

  const handleReject = (entry: LedgerEntry) => {
    setSelectedEntry(entry)
    setDialogAction('reject')
    setRejectionReason('')
    setIsDialogOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedEntry) return

    if (dialogAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    approveMutation.mutate({
      id: selectedEntry.id,
      action: dialogAction,
      rejectionReason: dialogAction === 'reject' ? rejectionReason.trim() : undefined,
    })
  }

  const pendingCount = pendingData?.pagination.total || 0
  const totalPendingAmount = pendingData?.data.reduce((sum, e) => sum + (e.paymentAmount || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debit Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve pending debit transactions</p>
      </div>

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

      {/* Pending Entries Table */}
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial No</TableHead>
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
                    <TableCell className="font-mono font-medium">{entry.serialNumber}</TableCell>
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
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(entry)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(entry)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
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

      {/* Approval/Rejection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setSelectedEntry(null)
          setRejectionReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' ? 'Confirm Approval' : 'Reject Entry'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approve'
                ? 'Are you sure you want to approve this debit entry?'
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serial Number</span>
                  <span className="font-mono font-medium">{selectedEntry.serialNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Party</span>
                  <span>{selectedEntry.party.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-right max-w-[200px] truncate">{selectedEntry.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Mode</span>
                  <span>{selectedEntry.paymentMode.name}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Amount</span>
                  <span className="text-red-600">-{formatCurrency(selectedEntry.paymentAmount || 0)}</span>
                </div>
              </div>

              {dialogAction === 'approve' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Balance Impact:</strong> This amount will be deducted from{' '}
                    <strong>{selectedEntry.paymentMode.name}</strong> immediately upon approval.
                  </p>
                </div>
              )}

              {dialogAction === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
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
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={approveMutation.isPending}
                  className={dialogAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  variant={dialogAction === 'reject' ? 'destructive' : 'default'}
                >
                  {approveMutation.isPending
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

