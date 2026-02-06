'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Search, Plus, ArrowUpCircle, ArrowDownCircle, Eye, CalendarIcon, X, ArrowLeftRight } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface PaymentType {
  id: string
  name: string
  paymentType: string
}

interface TypeOption {
  value: string
  label: string
}

interface StatusOption {
  value: string
  label: string
}

interface ComponentOption {
  value: string
  label: string
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
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [showProjectedTotals, setShowProjectedTotals] = useState(false)
  
  // Search states for comboboxes
  const [typeSearch, setTypeSearch] = useState('')
  const [statusSearch, setStatusSearch] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [headSearch, setHeadSearch] = useState('')
  const [paymentModeSearch, setPaymentModeSearch] = useState('')
  const [paymentTypeSearch, setPaymentTypeSearch] = useState('')
  const [componentSearch, setComponentSearch] = useState('')

  // Simple option arrays
  const typeOptions: TypeOption[] = [
    { value: 'all', label: 'All Types' },
    { value: 'CREDIT', label: 'Credit' },
    { value: 'DEBIT', label: 'Debit' },
    { value: 'SELF_TRANSFER', label: 'Self Transfer' },
  ]

  const statusOptions: StatusOption[] = [
    { value: 'all', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ]

  const componentOptions: ComponentOption[] = [
    { value: 'all', label: 'All Components' },
    { value: 'aOnly', label: 'A Only (0 B)' },
    { value: 'bOnly', label: 'B Only (0 A)' },
    { value: 'both', label: 'Both A and B' },
  ]

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
      params.set('limit', '10000')
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
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits (In)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(totals.credits)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits (Out)</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(totals.debits)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net (Credits - Debits)</p>
                <p className={`text-2xl font-bold ${totals.credits - totals.debits >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
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
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Revenue</p>
                  <p className="text-xs text-muted-foreground mb-1">(Excludes RECEIPT payment type)</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(projectedTotals.revenue)}</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Credits (All)</p>
                  <p className="text-xs text-muted-foreground mb-1">(Includes all CREDIT transactions)</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(projectedTotals.credits)}</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Debits (All)</p>
                  <p className="text-xs text-muted-foreground mb-1">(Includes all DEBIT transactions)</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(projectedTotals.debits)}</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debit Components Breakdown - Only show if there are approved debits */}
      {totals.debits > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Debit (A + B)</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(totals.debits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Component A</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(totals.debitComponentA)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Main expense</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Component B</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(totals.debitComponentB)}</p>
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by serial number, description, or party..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* All Filters in Horizontal Layout */}
            <div className="flex flex-wrap gap-3 items-end">
              {/* Transaction Type */}
              <div className="flex-shrink-0 min-w-[140px]">
                <Label htmlFor="typeFilter" className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Combobox<TypeOption>
                  items={typeOptions}
                  value={typeOptions.find((t) => t.value === typeFilter) ?? null}
                  onValueChange={(t) => setTypeFilter(t?.value ?? 'all')}
                  itemToStringLabel={(t) => t.label}
                  isItemEqualToValue={(a, b) => a?.value === b?.value}
                  inputValue={typeSearch}
                  onInputValueChange={setTypeSearch}
                >
                  <ComboboxInput
                    id="typeFilter"
                    placeholder="Select type"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No types found.</ComboboxEmpty>
                    <ComboboxList>
                      {(type: TypeOption) => (
                        <ComboboxItem key={type.value} value={type}>
                          {type.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Status */}
              <div className="flex-shrink-0 min-w-[140px]">
                <Label htmlFor="statusFilter" className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Combobox<StatusOption>
                  items={statusOptions}
                  value={statusOptions.find((s) => s.value === statusFilter) ?? null}
                  onValueChange={(s) => setStatusFilter(s?.value ?? 'all')}
                  itemToStringLabel={(s) => s.label}
                  isItemEqualToValue={(a, b) => a?.value === b?.value}
                  inputValue={statusSearch}
                  onInputValueChange={setStatusSearch}
                >
                  <ComboboxInput
                    id="statusFilter"
                    placeholder="Select status"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No status found.</ComboboxEmpty>
                    <ComboboxList>
                      {(status: StatusOption) => (
                        <ComboboxItem key={status.value} value={status}>
                          {status.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Payment Type */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="paymentTypeFilter" className="text-xs text-muted-foreground mb-1 block">Payment Type</Label>
                <Combobox<PaymentType | { id: string; name: string; paymentType: string }>
                  items={[
                    { id: 'all', name: 'All Payment Types', paymentType: '' },
                    ...(paymentTypesData?.data ?? []),
                  ]}
                  value={
                    paymentTypeFilter === 'all'
                      ? { id: 'all', name: 'All Payment Types', paymentType: '' }
                      : paymentTypesData?.data?.find((t) => t.id === paymentTypeFilter) ?? null
                  }
                  onValueChange={(t) => setPaymentTypeFilter(t?.id ?? 'all')}
                  itemToStringLabel={(t) => t.id === 'all' ? 'All Payment Types' : `${t.name} (${t.paymentType})`}
                  isItemEqualToValue={(a, b) => a?.id === b?.id}
                  inputValue={paymentTypeSearch}
                  onInputValueChange={setPaymentTypeSearch}
                >
                  <ComboboxInput
                    id="paymentTypeFilter"
                    placeholder="Select payment type"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No payment types found.</ComboboxEmpty>
                    <ComboboxList>
                      {(type: PaymentType | { id: string; name: string; paymentType: string }) => (
                        <ComboboxItem key={type.id} value={type}>
                          {type.id === 'all' ? 'All Payment Types' : `${type.name} (${type.paymentType})`}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Party */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="partyFilter" className="text-xs text-muted-foreground mb-1 block">Party</Label>
                <Combobox<Party | { id: string; name: string }>
                  items={[
                    { id: 'all', name: 'All Parties' },
                    ...(partiesData?.data ?? []),
                  ]}
                  value={
                    partyFilter === 'all'
                      ? { id: 'all', name: 'All Parties' }
                      : partiesData?.data?.find((p) => p.id === partyFilter) ?? null
                  }
                  onValueChange={(p) => setPartyFilter(p?.id ?? 'all')}
                  itemToStringLabel={(p) => p.name}
                  isItemEqualToValue={(a, b) => a?.id === b?.id}
                  inputValue={partySearch}
                  onInputValueChange={setPartySearch}
                >
                  <ComboboxInput
                    id="partyFilter"
                    placeholder="Select party"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No parties found.</ComboboxEmpty>
                    <ComboboxList>
                      {(party: Party | { id: string; name: string }) => (
                        <ComboboxItem key={party.id} value={party}>
                          {party.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Head */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="headFilter" className="text-xs text-muted-foreground mb-1 block">Head</Label>
                <Combobox<Head | { id: string; name: string }>
                  items={[
                    { id: 'all', name: 'All Heads' },
                    ...(headsData?.data ?? []),
                  ]}
                  value={
                    headFilter === 'all'
                      ? { id: 'all', name: 'All Heads' }
                      : headsData?.data?.find((h) => h.id === headFilter) ?? null
                  }
                  onValueChange={(h) => setHeadFilter(h?.id ?? 'all')}
                  itemToStringLabel={(h) => h.name}
                  isItemEqualToValue={(a, b) => a?.id === b?.id}
                  inputValue={headSearch}
                  onInputValueChange={setHeadSearch}
                >
                  <ComboboxInput
                    id="headFilter"
                    placeholder="Select head"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No heads found.</ComboboxEmpty>
                    <ComboboxList>
                      {(head: Head | { id: string; name: string }) => (
                        <ComboboxItem key={head.id} value={head}>
                          {head.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Payment Mode */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="paymentModeFilter" className="text-xs text-muted-foreground mb-1 block">Payment Mode</Label>
                <Combobox<PaymentMode | { id: string; name: string }>
                  items={[
                    { id: 'all', name: 'All Modes' },
                    ...(modesData?.data ?? []),
                  ]}
                  value={
                    paymentModeFilter === 'all'
                      ? { id: 'all', name: 'All Modes' }
                      : modesData?.data?.find((m) => m.id === paymentModeFilter) ?? null
                  }
                  onValueChange={(m) => setPaymentModeFilter(m?.id ?? 'all')}
                  itemToStringLabel={(m) => m.name}
                  isItemEqualToValue={(a, b) => a?.id === b?.id}
                  inputValue={paymentModeSearch}
                  onInputValueChange={setPaymentModeSearch}
                >
                  <ComboboxInput
                    id="paymentModeFilter"
                    placeholder="Select payment mode"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No payment modes found.</ComboboxEmpty>
                    <ComboboxList>
                      {(mode: PaymentMode | { id: string; name: string }) => (
                        <ComboboxItem key={mode.id} value={mode}>
                          {mode.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Component Filter */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="componentFilter" className="text-xs text-muted-foreground mb-1 block">Component</Label>
                <Combobox<ComponentOption>
                  items={componentOptions}
                  value={componentOptions.find((c) => c.value === componentFilter) ?? null}
                  onValueChange={(c) => setComponentFilter(c?.value ?? 'all')}
                  itemToStringLabel={(c) => c.label}
                  isItemEqualToValue={(a, b) => a?.value === b?.value}
                  inputValue={componentSearch}
                  onInputValueChange={setComponentSearch}
                >
                  <ComboboxInput
                    id="componentFilter"
                    placeholder="Select component"
                    showClear
                    className="h-9"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No components found.</ComboboxEmpty>
                    <ComboboxList>
                      {(component: ComponentOption) => (
                        <ComboboxItem key={component.value} value={component}>
                          {component.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Date Quick Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    const now = new Date()
                    setStartDate(startOfMonth(now))
                    setEndDate(endOfMonth(now))
                  }}
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    const lastMonth = subMonths(new Date(), 1)
                    setStartDate(startOfMonth(lastMonth))
                    setEndDate(endOfMonth(lastMonth))
                  }}
                >
                  Last Month
                </Button>
              </div>

              {/* Start Date */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                <div className="flex items-center gap-1">
                  <Dialog open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="startDate"
                        className="h-9 flex-1 justify-start text-left font-normal text-xs px-2"
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {startDate ? format(startDate, 'dd MMM') : 'Start'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setShowStartCalendar(false)
                        }}
                        initialFocus
                      />
                    </DialogContent>
                  </Dialog>
                  {startDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setStartDate(undefined)
                        setShowStartCalendar(false)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* End Date */}
              <div className="flex-shrink-0 min-w-[160px]">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground mb-1 block">End Date</Label>
                <div className="flex items-center gap-1">
                  <Dialog open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="endDate"
                        className="h-9 flex-1 justify-start text-left font-normal text-xs px-2"
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {endDate ? format(endDate, 'dd MMM') : 'End'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setShowEndCalendar(false)
                        }}
                        initialFocus
                      />
                    </DialogContent>
                  </Dialog>
                  {endDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setEndDate(undefined)
                        setShowEndCalendar(false)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Serial No</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Date</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Type</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Party</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Description</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Head</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Payment Type</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Payment Mode</TableHead>
                  <TableHead className="text-right bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Amount</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Status</TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData?.data.map((entry, index) => (
                  <TableRow key={entry.id} className={index % 2 === 0 ? 'bg-zinc-50/50 dark:bg-zinc-900/20' : ''}>
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

