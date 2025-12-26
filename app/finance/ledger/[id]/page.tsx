'use client'

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Calendar, User, Clock } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface AuditLog {
  id: string
  action: 'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED'
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function LedgerEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: entry, isLoading, error } = useQuery<LedgerEntry>({
    queryKey: ['ledger-entry', id],
    queryFn: () => apiGet<LedgerEntry>(`/api/finance/ledger/${id}`),
  })

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
      default:
        return <Badge variant="outline">{action}</Badge>
    }
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

  const isCredit = entry.transactionType === 'CREDIT'
  const amount = isCredit ? entry.receivedAmount || 0 : entry.paymentAmount || 0

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
          </div>
          <p className="text-muted-foreground mt-1">Ledger Entry Details</p>
        </div>
        <div className={`p-4 rounded-lg ${isCredit ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
          {isCredit ? (
            <ArrowUpCircle className="h-8 w-8 text-green-600" />
          ) : (
            <ArrowDownCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
      </div>

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

