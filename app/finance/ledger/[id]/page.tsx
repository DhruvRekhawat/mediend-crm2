'use client'

import { use, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Calendar, User, Clock, Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface AuditLog {
  id: string
  action: 'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED' | 'DELETED' | 'EDIT_REQUESTED' | 'EDIT_APPROVED' | 'EDIT_REJECTED'
  previousData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  reason: string | null
  performedAt: string
  performedBy: {
    id: string
    name: string
    email: string
  }
}

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
  rejectionReason: string | null
  approvedAt: string | null
  createdAt: string
  isDeleted: boolean
  deletedAt: string | null
  deletedReason: string | null
  deletedBy: {
    id: string
    name: string
    email: string
  } | null
  editRequestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  editRequestReason: string | null
  editRequestData: Record<string, unknown> | null
  editRequestedAt: string | null
  editRequestedBy: {
    id: string
    name: string
    email: string
  } | null
  editApprovalReason: string | null
  editApprovedAt: string | null
  editApprovedBy: {
    id: string
    name: string
    email: string
  } | null
  party: {
    id: string
    name: string
    partyType: string
    contactName: string | null
    contactPhone: string | null
    contactEmail: string | null
  }
  head: {
    id: string
    name: string
    department: string | null
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
  approvedBy: {
    id: string
    name: string
    email: string
  } | null
  auditLogs: AuditLog[]
}

interface Party {
  id: string
  name: string
}

interface Head {
  id: string
  name: string
}

interface PaymentType {
  id: string
  name: string
  paymentType: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function LedgerEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  const [editFormData, setEditFormData] = useState({
    description: '',
    transactionDate: '',
    partyId: '',
    headId: '',
    paymentTypeId: '',
    reason: '',
  })

  const [approvalReason, setApprovalReason] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  const { data: entry, isLoading, error } = useQuery<LedgerEntry>({
    queryKey: ['ledger-entry', id],
    queryFn: () => apiGet<LedgerEntry>(`/api/finance/ledger/${id}`),
  })

  // Fetch masters for edit form
  const { data: partiesData } = useQuery({
    queryKey: ['parties-list'],
    queryFn: () => apiGet<{ data: Party[] }>('/api/finance/parties?isActive=true&limit=100'),
  })

  const { data: headsData } = useQuery({
    queryKey: ['heads-list'],
    queryFn: () => apiGet<{ data: Head[] }>('/api/finance/heads?isActive=true&limit=100'),
  })

  const { data: paymentTypesData } = useQuery({
    queryKey: ['payment-types-list'],
    queryFn: () => apiGet<{ data: PaymentType[] }>('/api/finance/payment-types?isActive=true&limit=100'),
  })

  const requestEditMutation = useMutation({
    mutationFn: (data: { reason: string; changes: Record<string, unknown> }) =>
      apiPost(`/api/finance/ledger/${id}/request-edit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entry', id] })
      setEditDialogOpen(false)
      setEditFormData({ description: '', transactionDate: '', partyId: '', headId: '', paymentTypeId: '', reason: '' })
      toast.success('Edit request submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit edit request')
    },
  })

  const approveEditMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      apiPost(`/api/finance/ledger/${id}/approve-edit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entry', id] })
      setApproveDialogOpen(false)
      setApprovalReason('')
      toast.success('Edit request approved')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve edit request')
    },
  })

  const rejectEditMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      apiPost(`/api/finance/ledger/${id}/reject-edit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entry', id] })
      setRejectDialogOpen(false)
      setRejectionReason('')
      toast.success('Edit request rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject edit request')
    },
  })

  const applyEditMutation = useMutation({
    mutationFn: () => apiPatch(`/api/finance/ledger/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entry', id] })
      toast.success('Changes applied successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply changes')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      apiDelete(`/api/finance/ledger/${id}/delete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entry', id] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setDeleteDialogOpen(false)
      setDeleteReason('')
      toast.success('Entry deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete entry')
    },
  })

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MD'
  const isFinance = user?.role === 'FINANCE_HEAD'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <Badge variant="outline">Created</Badge>
      case 'UPDATED':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Updated</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      case 'DELETED':
        return <Badge variant="destructive">Deleted</Badge>
      case 'EDIT_REQUESTED':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Edit Requested</Badge>
      case 'EDIT_APPROVED':
        return <Badge className="bg-green-100 text-green-800">Edit Approved</Badge>
      case 'EDIT_REJECTED':
        return <Badge variant="destructive">Edit Rejected</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const handleRequestEdit = () => {
    if (!editFormData.reason.trim()) {
      toast.error('Please provide a reason for the edit')
      return
    }

    const changes: Record<string, unknown> = {}
    if (editFormData.description && editFormData.description !== entry?.description) {
      changes.description = editFormData.description
    }
    if (editFormData.transactionDate && editFormData.transactionDate !== entry?.transactionDate) {
      changes.transactionDate = editFormData.transactionDate
    }
    if (editFormData.partyId && editFormData.partyId !== entry?.party.id) {
      changes.partyId = editFormData.partyId
    }
    if (editFormData.headId && editFormData.headId !== entry?.head.id) {
      changes.headId = editFormData.headId
    }
    if (editFormData.paymentTypeId && editFormData.paymentTypeId !== entry?.paymentType.id) {
      changes.paymentTypeId = editFormData.paymentTypeId
    }

    if (Object.keys(changes).length === 0) {
      toast.error('Please make at least one change')
      return
    }

    requestEditMutation.mutate({
      reason: editFormData.reason,
      changes,
    })
  }

  const handleApproveEdit = () => {
    if (!approvalReason.trim()) {
      toast.error('Please provide an approval reason')
      return
    }
    approveEditMutation.mutate({ reason: approvalReason })
  }

  const handleRejectEdit = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    rejectEditMutation.mutate({ reason: rejectionReason })
  }

  const handleDelete = () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a deletion reason')
      return
    }
    deleteMutation.mutate({ reason: deleteReason })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Entry not found</p>
        <Link href="/finance/ledger">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ledger
          </Button>
        </Link>
      </div>
    )
  }

  if (entry.isDeleted) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">Entry Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">{entry.deletedReason}</p>
            {entry.deletedBy && (
              <p className="text-sm text-muted-foreground">
                Deleted by {entry.deletedBy.name} on {entry.deletedAt && format(new Date(entry.deletedAt), 'PPP p')}
              </p>
            )}
            <Link href="/finance/ledger" className="mt-4 inline-block">
              <Button variant="outline">Back to Ledger</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCredit = entry.transactionType === 'CREDIT'
  const amount = isCredit ? entry.receivedAmount || 0 : entry.paymentAmount || 0
  const canRequestEdit = isFinance && entry.status === 'APPROVED' && !entry.editRequestStatus
  const canApproveEdit = isAdmin && entry.editRequestStatus === 'PENDING'
  const canApplyEdit = isFinance && entry.editRequestStatus === 'APPROVED'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/finance/ledger">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono">{entry.serialNumber}</h1>
            {getStatusBadge(entry.status)}
            {entry.editRequestStatus && (
              <Badge variant="outline" className={entry.editRequestStatus === 'APPROVED' ? 'border-green-500 text-green-600' : entry.editRequestStatus === 'REJECTED' ? 'border-red-500 text-red-600' : 'border-yellow-500 text-yellow-600'}>
                Edit {entry.editRequestStatus}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Ledger Entry Details</p>
        </div>
        <div className="flex gap-2">
          {canRequestEdit && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setEditFormData({
                    description: entry.description,
                    transactionDate: entry.transactionDate.split('T')[0],
                    partyId: entry.party.id,
                    headId: entry.head.id,
                    paymentTypeId: entry.paymentType.id,
                    reason: '',
                  })
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Request Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request Edit</DialogTitle>
                  <DialogDescription>Request changes to this approved entry</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transactionDate">Transaction Date</Label>
                    <Input
                      id="transactionDate"
                      type="date"
                      value={editFormData.transactionDate}
                      onChange={(e) => setEditFormData({ ...editFormData, transactionDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partyId">Party</Label>
                    <Select value={editFormData.partyId} onValueChange={(value) => setEditFormData({ ...editFormData, partyId: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {partiesData?.data.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headId">Head</Label>
                    <Select value={editFormData.headId} onValueChange={(value) => setEditFormData({ ...editFormData, headId: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {headsData?.data.map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTypeId">Payment Type</Label>
                    <Select value={editFormData.paymentTypeId} onValueChange={(value) => setEditFormData({ ...editFormData, paymentTypeId: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTypesData?.data.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.paymentType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Edit *</Label>
                    <Textarea
                      id="reason"
                      value={editFormData.reason}
                      onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                      placeholder="Explain why this edit is needed..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRequestEdit} disabled={requestEditMutation.isPending}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canApproveEdit && (
            <>
              <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" />
                    Approve Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Approve Edit Request</DialogTitle>
                    <DialogDescription>Provide a reason for approving this edit request</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {entry.editRequestData && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Requested Changes:</p>
                        <pre className="text-xs overflow-auto">{JSON.stringify(entry.editRequestData, null, 2)}</pre>
                      </div>
                    )}
                    {entry.editRequestReason && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Request Reason:</p>
                        <p className="text-sm">{entry.editRequestReason}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="approvalReason">Approval Reason *</Label>
                      <Textarea
                        id="approvalReason"
                        value={approvalReason}
                        onChange={(e) => setApprovalReason(e.target.value)}
                        placeholder="Explain why you are approving this edit..."
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleApproveEdit} disabled={approveEditMutation.isPending} className="bg-green-600 hover:bg-green-700">
                        Approve
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <X className="h-4 w-4 mr-2" />
                    Reject Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Edit Request</DialogTitle>
                    <DialogDescription>Provide a reason for rejecting this edit request</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {entry.editRequestReason && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Request Reason:</p>
                        <p className="text-sm">{entry.editRequestReason}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                      <Textarea
                        id="rejectionReason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why you are rejecting this edit..."
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleRejectEdit} disabled={rejectEditMutation.isPending} variant="destructive">
                        Reject
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {canApplyEdit && (
            <Button onClick={() => applyEditMutation.mutate()} disabled={applyEditMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Apply Approved Edit
            </Button>
          )}
          {isAdmin && !entry.isDeleted && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Ledger Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will soft delete the entry. You must provide a reason for deletion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deleteReason">Deletion Reason *</Label>
                    <Textarea
                      id="deleteReason"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Explain why you are deleting this entry..."
                      rows={3}
                      required
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className={`p-4 rounded-lg ${isCredit ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
          {isCredit ? (
            <ArrowUpCircle className="h-8 w-8 text-green-600" />
          ) : (
            <ArrowDownCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
      </div>

      {/* Edit Request Status */}
      {entry.editRequestStatus && (
        <Card className={entry.editRequestStatus === 'APPROVED' ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : entry.editRequestStatus === 'REJECTED' ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10'}>
          <CardHeader>
            <CardTitle className={entry.editRequestStatus === 'APPROVED' ? 'text-green-700 dark:text-green-400' : entry.editRequestStatus === 'REJECTED' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}>
              Edit Request {entry.editRequestStatus}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entry.editRequestReason && (
              <div>
                <p className="text-sm font-medium mb-1">Request Reason:</p>
                <p className="text-sm">{entry.editRequestReason}</p>
              </div>
            )}
            {entry.editRequestData && (
              <div>
                <p className="text-sm font-medium mb-1">Requested Changes:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-auto">{JSON.stringify(entry.editRequestData, null, 2)}</pre>
              </div>
            )}
            {entry.editApprovalReason && (
              <div>
                <p className="text-sm font-medium mb-1">{entry.editRequestStatus === 'APPROVED' ? 'Approval' : 'Rejection'} Reason:</p>
                <p className="text-sm">{entry.editApprovalReason}</p>
              </div>
            )}
            {entry.editRequestedBy && (
              <p className="text-xs text-muted-foreground">
                Requested by {entry.editRequestedBy.name} on {entry.editRequestedAt && format(new Date(entry.editRequestedAt), 'PPP p')}
              </p>
            )}
            {entry.editApprovedBy && (
              <p className="text-xs text-muted-foreground">
                {entry.editRequestStatus === 'APPROVED' ? 'Approved' : 'Rejected'} by {entry.editApprovedBy.name} on {entry.editApprovedAt && format(new Date(entry.editApprovedAt), 'PPP p')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Transaction Type</label>
                <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.transactionType} ({isCredit ? 'Money In' : 'Money Out'})
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Transaction Date</label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(entry.transactionDate), 'PPP')}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <p className="font-medium">{entry.description}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Amount</label>
                <p className={`text-2xl font-bold font-mono ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                  {isCredit ? '+' : '-'}{formatCurrency(amount)}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Party</label>
                <p className="font-semibold">{entry.party.name}</p>
                <p className="text-sm text-muted-foreground">{entry.party.partyType}</p>
                {entry.party.contactPhone && <p className="text-sm">{entry.party.contactPhone}</p>}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Head</label>
                <p className="font-medium">{entry.head.name}</p>
                {entry.head.department && <p className="text-sm text-muted-foreground">{entry.head.department}</p>}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Payment Type</label>
                <p>{entry.paymentType.name} ({entry.paymentType.paymentType})</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Payment Mode</label>
                <p className="font-medium">{entry.paymentMode.name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Information */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Information</CardTitle>
          <CardDescription>Balance snapshot at time of transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <label className="text-sm text-muted-foreground">Opening Balance</label>
              <p className="text-xl font-mono font-semibold">{formatCurrency(entry.openingBalance)}</p>
            </div>
            <div className={`p-4 rounded-lg ${isCredit ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
              <label className="text-sm text-muted-foreground">Transaction</label>
              <p className={`text-xl font-mono font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                {isCredit ? '+' : '-'}{formatCurrency(amount)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <label className="text-sm text-muted-foreground">Current Balance</label>
              <p className="text-xl font-mono font-semibold">{formatCurrency(entry.currentBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      {entry.status === 'REJECTED' && entry.rejectionReason && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">Rejection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">{entry.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Meta Information */}
      <Card>
        <CardHeader>
          <CardTitle>Meta Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm text-muted-foreground">Created By</label>
                <p>{entry.createdBy.name}</p>
                <p className="text-xs text-muted-foreground">{entry.createdBy.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm text-muted-foreground">Created At</label>
                <p>{format(new Date(entry.createdAt), 'PPP p')}</p>
              </div>
            </div>
            {entry.approvedBy && (
              <>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <label className="text-sm text-muted-foreground">
                      {entry.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}
                    </label>
                    <p>{entry.approvedBy.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.approvedBy.email}</p>
                  </div>
                </div>
                {entry.approvedAt && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {entry.status === 'APPROVED' ? 'Approved At' : 'Rejected At'}
                      </label>
                      <p>{format(new Date(entry.approvedAt), 'PPP p')}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      {entry.auditLogs && entry.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Complete history of changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entry.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionBadge(log.action)}
                      <span className="text-sm text-muted-foreground">
                        by {log.performedBy.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.performedAt), 'PPP p')}
                    </p>
                    {log.reason && (
                      <p className="text-sm mt-1 text-red-600">{log.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
