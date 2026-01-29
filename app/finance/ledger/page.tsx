'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Search, Plus, ArrowUpCircle, ArrowDownCircle, Eye, CalendarIcon, X, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface LedgerEntry {
  id: string
  serialNumber: string
  transactionType: 'CREDIT' | 'DEBIT' | 'SELF_TRANSFER'
  transactionDate: string
  description: string
  paymentAmount: number | null
  componentA: number | null
  componentB: number | null
  receivedAmount: number | null
  transferAmount: number | null
  openingBalance: number
  currentBalance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  party: {
    id: string
    name: string
    partyType: string
  } | null
  head: {
    id: string
    name: string
    department: string | null
  } | null
  paymentType: {
    id: string
    name: string
    paymentType: string
  } | null
  paymentMode: {
    id: string
    name: string
  } | null
  fromPaymentMode: {
    id: string
    name: string
  } | null
  toPaymentMode: {
    id: string
    name: string
  } | null
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

interface Party {
  id: string
  name: string
}

interface Head {
  id: string
  name: string
}

interface PaymentMode {
  id: string
  name: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface PaymentType {
  id: string
  name: string
  paymentType: string
}

export default function LedgerPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [partyFilter, setPartyFilter] = useState<string>('all')
  const [headFilter, setHeadFilter] = useState<string>('all')
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [componentFilter, setComponentFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [showProjectedTotals, setShowProjectedTotals] = useState(false)

  // Fetch ledger entries
  const { data: ledgerData, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['ledger', search, typeFilter, statusFilter, partyFilter, headFilter, paymentModeFilter, paymentTypeFilter, componentFilter, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('transactionType', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (partyFilter !== 'all') params.set('partyId', partyFilter)
      if (headFilter !== 'all') params.set('headId', headFilter)
      if (paymentModeFilter !== 'all') params.set('paymentModeId', paymentModeFilter)
      if (paymentTypeFilter !== 'all') params.set('paymentTypeId', paymentTypeFilter)
      if (componentFilter !== 'all') params.set('componentFilter', componentFilter)
      if (startDate) {
        // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
        const year = startDate.getFullYear()
        const month = String(startDate.getMonth() + 1).padStart(2, '0')
        const day = String(startDate.getDate()).padStart(2, '0')
        params.set('startDate', `${year}-${month}-${day}`)
      }
      if (endDate) {
        // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
        const year = endDate.getFullYear()
        const month = String(endDate.getMonth() + 1).padStart(2, '0')
        const day = String(endDate.getDate()).padStart(2, '0')
        params.set('endDate', `${year}-${month}-${day}`)
      }
      return apiGet<LedgerResponse>(`/api/finance/ledger?${params.toString()}`)
    },
  })

  // Fetch masters for filters - only show parties/heads that have entries
  const { data: partiesData } = useQuery({
    queryKey: ['parties-list-filtered'],
    queryFn: () => apiGet<{ data: Party[] }>('/api/finance/parties?isActive=true&hasEntries=true&limit=100'),
  })

  const { data: headsData } = useQuery({
    queryKey: ['heads-list-filtered'],
    queryFn: () => apiGet<{ data: Head[] }>('/api/finance/heads?isActive=true&hasEntries=true&limit=100'),
  })

  const { data: modesData } = useQuery({
    queryKey: ['modes-list'],
    queryFn: () => apiGet<{ data: PaymentMode[] }>('/api/finance/payment-modes?isActive=true&limit=100'),
  })

  const { data: paymentTypesData } = useQuery({
    queryKey: ['payment-types-list'],
    queryFn: () => apiGet<{ data: PaymentType[] }>('/api/finance/payment-types?isActive=true&limit=100'),
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

  const getTransactionIcon = (type: string) => {
    if (type === 'CREDIT') {
      return <ArrowUpCircle className="h-5 w-5 text-green-600" />
    } else if (type === 'SELF_TRANSFER') {
      return <ArrowLeftRight className="h-5 w-5 text-blue-600" />
    }
    return <ArrowDownCircle className="h-5 w-5 text-red-600" />
  }

  // Calculate totals for filtered entries - Exclude SELF_TRANSFER
  const totals = ledgerData?.data.reduce(
    (acc, entry) => {
      if (entry.status === 'APPROVED' && entry.transactionType !== 'SELF_TRANSFER') {
        if (entry.transactionType === 'CREDIT') {
          acc.credits += entry.receivedAmount || 0
        } else if (entry.transactionType === 'DEBIT') {
          // For DEBIT transactions, track total, component A, and component B
          const totalDebit = entry.paymentAmount || 0
          const componentA = entry.componentA || 0
          const componentB = entry.componentB || 0
          acc.debits += totalDebit
          acc.debitComponentA += componentA
          acc.debitComponentB += componentB
        }
      }
      return acc
    },
    { credits: 0, debits: 0, debitComponentA: 0, debitComponentB: 0 }
  ) || { credits: 0, debits: 0, debitComponentA: 0, debitComponentB: 0 }

  // Calculate projected totals assuming all transactions are approved - Exclude SELF_TRANSFER and RECEIPT payment types
  const projectedTotals = ledgerData?.data.reduce(
    (acc, entry) => {
      if (entry.transactionType !== 'SELF_TRANSFER') {
        // Exclude RECEIPT payment type from revenue calculations
        const isReceipt = entry.paymentType?.paymentType === 'RECEIPT'
        
        if (entry.transactionType === 'CREDIT' && !isReceipt) {
          acc.revenue += entry.receivedAmount || 0
          acc.credits += entry.receivedAmount || 0
        } else if (entry.transactionType === 'CREDIT' && isReceipt) {
          // RECEIPT credits don't count toward revenue but still count as credits
          acc.credits += entry.receivedAmount || 0
        } else if (entry.transactionType === 'DEBIT') {
          const totalDebit = entry.paymentAmount || 0
          acc.debits += totalDebit
        }
      }
      return acc
    },
    { revenue: 0, credits: 0, debits: 0 }
  ) || { revenue: 0, credits: 0, debits: 0 }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Ledger</h1>
          <p className="text-muted-foreground mt-1">View and manage all financial transactions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-projected"
              checked={showProjectedTotals}
              onCheckedChange={(checked) => setShowProjectedTotals(checked === true)}
            />
            <Label
              htmlFor="show-projected"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show projected totals
            </Label>
          </div>
          <Link href="/finance/ledger/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits (In)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.credits)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits (Out)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.debits)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net (Credits - Debits)</p>
                <p className={`text-2xl font-bold ${totals.credits - totals.debits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.credits - totals.debits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projected Totals Cards - Show when toggle is on */}
      {showProjectedTotals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Revenue</p>
                  <p className="text-xs text-muted-foreground mb-1">(Excludes RECEIPT payment type)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedTotals.revenue)}</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Credits (All)</p>
                  <p className="text-xs text-muted-foreground mb-1">(Includes all CREDIT transactions)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(projectedTotals.credits)}</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Debits (All)</p>
                  <p className="text-xs text-muted-foreground mb-1">(Includes all DEBIT transactions)</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(projectedTotals.debits)}</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debit Components Breakdown - Only show if there are approved debits */}
      {totals.debits > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Debit (A + B)</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.debits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Component A</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.debitComponentA)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Main expense</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Component B</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.debitComponentB)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Claimable amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter ledger entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="SELF_TRANSFER">Self Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Types</SelectItem>
                  {paymentTypesData?.data.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.paymentType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={partyFilter} onValueChange={setPartyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {partiesData?.data.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={headFilter} onValueChange={setHeadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Heads</SelectItem>
                  {headsData?.data.map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {modesData?.data.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id}>
                      {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={componentFilter} onValueChange={setComponentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Component Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="aOnly">A Only (0 B)</SelectItem>
                  <SelectItem value="bOnly">B Only (0 A)</SelectItem>
                  <SelectItem value="both">Both A and B</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowStartCalendar(!showStartCalendar)}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd MMM yyyy') : 'Start Date'}
                  </Button>
                  {startDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStartDate(undefined)
                        setShowStartCalendar(false)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {showStartCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-background border rounded-md shadow-lg">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setShowStartCalendar(false)
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEndCalendar(!showEndCalendar)}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd MMM yyyy') : 'End Date'}
                  </Button>
                  {endDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEndDate(undefined)
                        setShowEndCalendar(false)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {showEndCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-background border rounded-md shadow-lg">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setShowEndCalendar(false)
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>Total: {ledgerData?.pagination.total || 0} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData?.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-medium">{entry.serialNumber}</TableCell>
                    <TableCell>{format(new Date(entry.transactionDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(entry.transactionType)}
                        <span className={
                          entry.transactionType === 'CREDIT' ? 'text-green-600' :
                          entry.transactionType === 'SELF_TRANSFER' ? 'text-blue-600' :
                          'text-red-600'
                        }>
                          {entry.transactionType === 'SELF_TRANSFER' ? 'Self Transfer' : entry.transactionType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.transactionType === 'SELF_TRANSFER' ? (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      ) : entry.party ? (
                        <div>
                          <div className="font-medium">{entry.party.name}</div>
                          <div className="text-xs text-muted-foreground">{entry.party.partyType}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      {entry.transactionType === 'SELF_TRANSFER' ? (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      ) : entry.head ? (
                        entry.head.name
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.transactionType === 'SELF_TRANSFER' ? (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      ) : entry.paymentType ? (
                        <div>
                          <div className="font-medium">{entry.paymentType.name}</div>
                          <div className="text-xs text-muted-foreground">{entry.paymentType.paymentType}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.transactionType === 'SELF_TRANSFER' ? (
                        <div className="text-sm">
                          <div className="font-medium text-blue-600">
                            {entry.fromPaymentMode?.name || 'N/A'} → {entry.toPaymentMode?.name || 'N/A'}
                          </div>
                        </div>
                      ) : entry.paymentMode ? (
                        entry.paymentMode.name
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <div className="flex flex-col items-end gap-1">
                        {entry.transactionType === 'SELF_TRANSFER' ? (
                          <span className="text-blue-600">
                            {formatCurrency(entry.transferAmount || 0)}
                          </span>
                        ) : (
                          <>
                            <span className={entry.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                              {entry.transactionType === 'CREDIT'
                                ? `+${formatCurrency(entry.receivedAmount || 0)}`
                                : `-${formatCurrency(entry.paymentAmount || 0)}`}
                            </span>
                            {entry.transactionType === 'DEBIT' && (entry.componentA || entry.componentB) && (
                              <div className="text-xs text-muted-foreground font-normal">
                                <div>A: {formatCurrency(entry.componentA || 0)}</div>
                                {entry.componentB && entry.componentB > 0 && (
                                  <div>B: {formatCurrency(entry.componentB)}</div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry.status)}
                      {entry.rejectionReason && (
                        <div className="text-xs text-red-500 mt-1">{entry.rejectionReason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/finance/ledger/${entry.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!ledgerData?.data || ledgerData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

