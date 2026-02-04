'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { ArrowLeft, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, AlertCircle, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

interface Party {
  id: string
  name: string
  partyType: string
  isActive: boolean
}

interface Head {
  id: string
  name: string
  department: string | null
  isActive: boolean
}

interface PaymentType {
  id: string
  name: string
  paymentType: string
  isActive: boolean
}

interface PaymentMode {
  id: string
  name: string
  currentBalance: number
  isActive: boolean
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function NewLedgerEntryPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT' | 'SELF_TRANSFER'>('CREDIT')
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showPartyCreateDialog, setShowPartyCreateDialog] = useState(false)
  const [showHeadCreateDialog, setShowHeadCreateDialog] = useState(false)
  const [newPartyName, setNewPartyName] = useState('')
  const [newHeadName, setNewHeadName] = useState('')
  const [newPartyType, setNewPartyType] = useState<'BUYER' | 'SELLER' | 'VENDOR' | 'CLIENT' | 'SUPPLIER' | 'OTHER'>('OTHER')
  const [partySearch, setPartySearch] = useState('')
  const [headSearch, setHeadSearch] = useState('')
  const [formData, setFormData] = useState({
    partyId: '',
    description: '',
    headId: '',
    paymentTypeId: '',
    paymentModeId: '',
    amount: '',
    componentA: '',
    componentB: '',
    fromPaymentModeId: '',
    toPaymentModeId: '',
    transferAmount: '',
  })

  // Fetch masters
  const { data: partiesData } = useQuery({
    queryKey: ['parties-active'],
    queryFn: () => apiGet<{ data: Party[] }>('/api/finance/parties?isActive=true&limit=100'),
  })

  const { data: headsData } = useQuery({
    queryKey: ['heads-active'],
    queryFn: () => apiGet<{ data: Head[] }>('/api/finance/heads?isActive=true&limit=100'),
  })

  const { data: paymentTypesData } = useQuery({
    queryKey: ['payment-types-active'],
    queryFn: () => apiGet<{ data: PaymentType[] }>('/api/finance/payment-types?isActive=true&limit=100'),
  })

  const { data: paymentModesData } = useQuery({
    queryKey: ['payment-modes-active'],
    queryFn: () => apiGet<{ data: PaymentMode[] }>('/api/finance/payment-modes?isActive=true&limit=100'),
  })

  const selectedPaymentMode = paymentModesData?.data.find((m) => m.id === formData.paymentModeId)
  const selectedFromMode = paymentModesData?.data.find((m) => m.id === formData.fromPaymentModeId)
  const selectedToMode = paymentModesData?.data.find((m) => m.id === formData.toPaymentModeId)
  const selectedPaymentType = paymentTypesData?.data.find((t) => t.id === formData.paymentTypeId)
  const isNonExpense = selectedPaymentType?.paymentType === 'NON_EXPENSE'

  const createPartyMutation = useMutation({
    mutationFn: async (data: { name: string; partyType: string }): Promise<Party> => {
      return apiPost<Party>('/api/finance/parties', data)
    },
    onSuccess: (data: Party) => {
      queryClient.invalidateQueries({ queryKey: ['parties-active'] })
      setFormData({ ...formData, partyId: data.id })
      setShowPartyCreateDialog(false)
      setNewPartyName('')
      toast.success('Party created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create party')
    },
  })

  const createHeadMutation = useMutation({
    mutationFn: async (data: { name: string; department?: string }): Promise<Head> => {
      return apiPost<Head>('/api/finance/heads', data)
    },
    onSuccess: (data: Head) => {
      queryClient.invalidateQueries({ queryKey: ['heads-active'] })
      setFormData({ ...formData, headId: data.id })
      setShowHeadCreateDialog(false)
      setNewHeadName('')
      toast.success('Head created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create head')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      transactionType: string
      transactionDate: string
      partyId?: string
      description: string
      headId?: string
      paymentTypeId?: string
      paymentModeId?: string
      paymentAmount?: number
      componentA?: number
      componentB?: number
      receivedAmount?: number
      fromPaymentModeId?: string
      toPaymentModeId?: string
      transferAmount?: number
    }) => apiPost('/api/finance/ledger', data),
    onSuccess: () => {
      if (transactionType === 'CREDIT') {
        toast.success('Credit entry created and auto-approved!')
      } else if (transactionType === 'SELF_TRANSFER') {
        toast.success('Self transfer entry created and auto-approved!')
      } else {
        toast.success('Debit entry created! Awaiting MD approval.')
      }
      router.push('/finance/ledger')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create entry')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (transactionType === 'CREDIT') {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      const data = {
        transactionType,
        transactionDate: transactionDate.toISOString(),
        partyId: formData.partyId,
        description: formData.description,
        headId: formData.headId,
        paymentTypeId: formData.paymentTypeId,
        paymentModeId: formData.paymentModeId,
        receivedAmount: amount,
      }

      createMutation.mutate(data)
    } else if (transactionType === 'SELF_TRANSFER') {
      // For SELF_TRANSFER transactions
      const transferAmount = parseFloat(formData.transferAmount)
      if (isNaN(transferAmount) || transferAmount <= 0) {
        toast.error('Please enter a valid transfer amount')
        return
      }

      if (!formData.fromPaymentModeId || !formData.toPaymentModeId) {
        toast.error('Please select both from and to payment modes')
        return
      }

      if (formData.fromPaymentModeId === formData.toPaymentModeId) {
        toast.error('From and to payment modes must be different')
        return
      }

      const data = {
        transactionType,
        transactionDate: transactionDate.toISOString(),
        description: formData.description,
        fromPaymentModeId: formData.fromPaymentModeId,
        toPaymentModeId: formData.toPaymentModeId,
        transferAmount,
      }

      createMutation.mutate(data)
    } else {
      // For DEBIT transactions, validate component A and B
      // If NON_EXPENSE, Component A should be 0
      const componentA = isNonExpense ? 0 : parseFloat(formData.componentA)
      const componentB = parseFloat(formData.componentB) || 0

      if (!isNonExpense && (isNaN(componentA) || componentA <= 0)) {
        toast.error('Please enter a valid Component A (main expense)')
        return
      }

      if (isNaN(componentB) || componentB < 0) {
        toast.error('Component B (claimable amount) must be a valid non-negative number')
        return
      }

      const data = {
        transactionType,
        transactionDate: transactionDate.toISOString(),
        partyId: formData.partyId,
        description: formData.description,
        headId: formData.headId,
        paymentTypeId: formData.paymentTypeId,
        paymentModeId: formData.paymentModeId,
        componentA: isNonExpense ? 0 : componentA,
        componentB: componentB > 0 ? componentB : undefined,
      }

      createMutation.mutate(data)
    }
  }

  // Calculate balance impact preview
  // For NON_EXPENSE, Component A is 0, so only Component B counts
  const componentAValue = isNonExpense ? 0 : (parseFloat(formData.componentA) || 0)
  const amount = transactionType === 'CREDIT' 
    ? (parseFloat(formData.amount) || 0)
    : transactionType === 'SELF_TRANSFER'
    ? (parseFloat(formData.transferAmount) || 0)
    : (componentAValue + (parseFloat(formData.componentB) || 0))
  const currentBalance = selectedPaymentMode?.currentBalance || 0
  const fromCurrentBalance = selectedFromMode?.currentBalance || 0
  const toCurrentBalance = selectedToMode?.currentBalance || 0
  const projectedBalance = transactionType === 'CREDIT'
    ? currentBalance + amount
    : transactionType === 'SELF_TRANSFER'
    ? { from: fromCurrentBalance - amount, to: toCurrentBalance + amount }
    : currentBalance - amount

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/finance/ledger">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Ledger Entry</h1>
          <p className="text-muted-foreground mt-1">Create a new financial transaction</p>
        </div>
      </div>

      {/* Transaction Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Type</CardTitle>
          <CardDescription>Select whether this is incoming (credit) or outgoing (debit)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setTransactionType('CREDIT')}
              className={`p-6 rounded-lg border-2 transition-all ${
                transactionType === 'CREDIT'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-muted hover:border-green-300'
              }`}
            >
              <ArrowUpCircle className={`h-10 w-10 mx-auto mb-2 ${
                transactionType === 'CREDIT' ? 'text-green-600' : 'text-muted-foreground'
              }`} />
              <div className="font-semibold">Credit (In)</div>
              <div className="text-sm text-muted-foreground">Money received</div>
              <div className="text-xs text-green-600 mt-2">Auto-approved</div>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('DEBIT')}
              className={`p-6 rounded-lg border-2 transition-all ${
                transactionType === 'DEBIT'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-muted hover:border-red-300'
              }`}
            >
              <ArrowDownCircle className={`h-10 w-10 mx-auto mb-2 ${
                transactionType === 'DEBIT' ? 'text-red-600' : 'text-muted-foreground'
              }`} />
              <div className="font-semibold">Debit (Out)</div>
              <div className="text-sm text-muted-foreground">Money paid</div>
              <div className="text-xs text-amber-600 mt-2">Requires MD approval</div>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('SELF_TRANSFER')}
              className={`p-6 rounded-lg border-2 transition-all ${
                transactionType === 'SELF_TRANSFER'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-muted hover:border-blue-300'
              }`}
            >
              <ArrowLeftRight className={`h-10 w-10 mx-auto mb-2 ${
                transactionType === 'SELF_TRANSFER' ? 'text-blue-600' : 'text-muted-foreground'
              }`} />
              <div className="font-semibold">Self Transfer</div>
              <div className="text-sm text-muted-foreground">Between payment modes</div>
              <div className="text-xs text-green-600 mt-2">Auto-approved</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
            <CardDescription>Fill in the transaction details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date */}
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(transactionDate, 'PPP')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => {
                      if (date) {
                        setTransactionDate(date)
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={transactionType === 'SELF_TRANSFER' 
                  ? "e.g., Transfer from Bank A to Bank B"
                  : "e.g., Website development, Sales commission, Office rent"}
                rows={2}
                required
              />
            </div>

            {/* Fields for CREDIT/DEBIT only */}
            {transactionType !== 'SELF_TRANSFER' && (
              <>
                {/* Party */}
                <div className="space-y-2">
                  <Label htmlFor="party">Party *</Label>
                  <Combobox<Party>
                    items={partiesData?.data ?? []}
                    value={partiesData?.data?.find((p) => p.id === formData.partyId) ?? null}
                    onValueChange={(p) => setFormData((prev) => ({ ...prev, partyId: p?.id ?? '' }))}
                    itemToStringLabel={(p) => `${p.name} (${p.partyType})`}
                    isItemEqualToValue={(a, b) => a?.id === b?.id}
                    inputValue={partySearch}
                    onInputValueChange={setPartySearch}
                  >
                    <ComboboxInput
                      id="party"
                      placeholder="Select party"
                      showClear
                      className="w-full"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>
                        {partySearch ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setNewPartyName(partySearch)
                              setShowPartyCreateDialog(true)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create new party: {partySearch}
                          </Button>
                        ) : (
                          'No parties found.'
                        )}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(party: Party) => (
                          <ComboboxItem key={party.id} value={party}>
                            {party.name} ({party.partyType})
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                {/* Head */}
                <div className="space-y-2">
                  <Label htmlFor="head">Head *</Label>
                  <Combobox<Head>
                    items={headsData?.data ?? []}
                    value={headsData?.data?.find((h) => h.id === formData.headId) ?? null}
                    onValueChange={(h) => setFormData((prev) => ({ ...prev, headId: h?.id ?? '' }))}
                    itemToStringLabel={(h) => (h.department ? `${h.name} (${h.department})` : h.name)}
                    isItemEqualToValue={(a, b) => a?.id === b?.id}
                    inputValue={headSearch}
                    onInputValueChange={setHeadSearch}
                  >
                    <ComboboxInput
                      id="head"
                      placeholder="Select head"
                      showClear
                      className="w-full"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>
                        {headSearch ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setNewHeadName(headSearch)
                              setShowHeadCreateDialog(true)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create new head: {headSearch}
                          </Button>
                        ) : (
                          'No heads found.'
                        )}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(head: Head) => (
                          <ComboboxItem key={head.id} value={head}>
                            {head.department ? `${head.name} (${head.department})` : head.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                {/* Payment Type */}
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Type of Payment *</Label>
                  <Select
                    value={formData.paymentTypeId}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        paymentTypeId: value,
                        // Reset Component A when NON_EXPENSE is selected
                        componentA: paymentTypesData?.data.find(t => t.id === value)?.paymentType === 'NON_EXPENSE' ? '0' : formData.componentA
                      })
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
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
              </>
            )}

            {/* Fields for SELF_TRANSFER */}
            {transactionType === 'SELF_TRANSFER' && (
              <>
                {/* From Payment Mode */}
                <div className="space-y-2">
                  <Label htmlFor="fromPaymentMode">From Payment Mode *</Label>
                  <Select
                    value={formData.fromPaymentModeId}
                    onValueChange={(value) => setFormData({ ...formData, fromPaymentModeId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModesData?.data.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>
                          {mode.name} (Balance: {formatCurrency(mode.currentBalance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Payment Mode */}
                <div className="space-y-2">
                  <Label htmlFor="toPaymentMode">To Payment Mode *</Label>
                  <Select
                    value={formData.toPaymentModeId}
                    onValueChange={(value) => setFormData({ ...formData, toPaymentModeId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModesData?.data
                        .filter((mode) => mode.id !== formData.fromPaymentModeId)
                        .map((mode) => (
                          <SelectItem key={mode.id} value={mode.id}>
                            {mode.name} (Balance: {formatCurrency(mode.currentBalance)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transfer Amount */}
                <div className="space-y-2">
                  <Label htmlFor="transferAmount">Transfer Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="transferAmount"
                      type="number"
                      min="0.01"
                      step="any"
                      value={formData.transferAmount}
                      onChange={(e) => setFormData({ ...formData, transferAmount: e.target.value })}
                      className="pl-8"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Amount - Different fields for CREDIT vs DEBIT */}
            {transactionType === 'CREDIT' && (
              <div className="space-y-2">
                <Label htmlFor="amount">Received Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="any"
                      value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-8"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            )}

            {transactionType === 'DEBIT' && (
              <>
                {!isNonExpense && (
                  <div className="space-y-2">
                    <Label htmlFor="componentA">Component A (Main Expense) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        id="componentA"
                        type="number"
                        min="0.01"
                        step="any"
                        value={formData.componentA}
                        onChange={(e) => setFormData({ ...formData, componentA: e.target.value })}
                        className="pl-8"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">The main expense amount (more relevant)</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="componentB">Component B (Claimable Amount)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="componentB"
                      type="number"
                      min="0"
                      step="any"
                      value={formData.componentB}
                      onChange={(e) => setFormData({ ...formData, componentB: e.target.value })}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Amount that can be claimed back (e.g., 18%, 5%, 0% of Component A)</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Payment Amount:</span>
                    <span className="font-semibold text-lg">
                      ₹{(componentAValue + (parseFloat(formData.componentB) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground">
                    {!isNonExpense && (
                      <span>Component A: ₹{componentAValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                    <span>Component B: ₹{(parseFloat(formData.componentB) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </>
            )}

            {/* Payment Mode - Only for CREDIT/DEBIT */}
            {transactionType !== 'SELF_TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <Select
                  value={formData.paymentModeId}
                  onValueChange={(value) => setFormData({ ...formData, paymentModeId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModesData?.data.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>
                        {mode.name} (Balance: {formatCurrency(mode.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Balance Impact Preview */}
            {transactionType === 'SELF_TRANSFER' && formData.fromPaymentModeId && formData.toPaymentModeId && formData.transferAmount && (
              <Card className="bg-blue-50 dark:bg-blue-900/10">
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Balance Impact Preview
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">From: {selectedFromMode?.name}</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Current Balance</div>
                          <div className="font-mono font-semibold">{formatCurrency(fromCurrentBalance)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Projected Balance</div>
                          <div className="font-mono font-semibold text-red-600">
                            {formatCurrency(typeof projectedBalance === 'object' ? projectedBalance.from : 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">To: {selectedToMode?.name}</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Current Balance</div>
                          <div className="font-mono font-semibold">{formatCurrency(toCurrentBalance)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Projected Balance</div>
                          <div className="font-mono font-semibold text-green-600">
                            {formatCurrency(typeof projectedBalance === 'object' ? projectedBalance.to : 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center pt-2 border-t">
                      <div className="text-muted-foreground text-sm">Transfer Amount</div>
                      <div className="font-mono font-semibold text-lg">{formatCurrency(amount)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {transactionType !== 'SELF_TRANSFER' && formData.paymentModeId && (formData.amount || componentAValue || formData.componentB) && (
              <Card className={transactionType === 'CREDIT' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-amber-50 dark:bg-amber-900/10'}>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Balance Impact Preview
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Current Balance</div>
                      <div className="font-mono font-semibold">{formatCurrency(currentBalance)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        {transactionType === 'CREDIT' ? 'Amount In' : 'Amount Out'}
                      </div>
                      <div className={`font-mono font-semibold ${
                        transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Projected Balance</div>
                      <div className="font-mono font-semibold">
                        {formatCurrency(typeof projectedBalance === 'number' ? projectedBalance : 0)}
                      </div>
                    </div>
                  </div>
                  {transactionType === 'DEBIT' && (
                    <p className="text-xs text-amber-600 mt-2">
                      * Balance will only be updated after MD approval
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href="/finance/ledger">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className={
                  transactionType === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' :
                  transactionType === 'SELF_TRANSFER' ? 'bg-blue-600 hover:bg-blue-700' :
                  ''
                }
              >
                {createMutation.isPending ? 'Creating...' : 
                  transactionType === 'CREDIT' ? 'Create & Auto-Approve' :
                  transactionType === 'SELF_TRANSFER' ? 'Create & Auto-Approve' :
                  'Create (Pending Approval)'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Create Party Dialog */}
      <Dialog open={showPartyCreateDialog} onOpenChange={setShowPartyCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Party</DialogTitle>
            <DialogDescription>Create a new party for transactions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPartyName">Party Name *</Label>
              <Input
                id="newPartyName"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Enter party name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPartyType">Party Type *</Label>
              <Select value={newPartyType} onValueChange={(value: any) => setNewPartyType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER">BUYER</SelectItem>
                  <SelectItem value="SELLER">SELLER</SelectItem>
                  <SelectItem value="VENDOR">VENDOR</SelectItem>
                  <SelectItem value="CLIENT">CLIENT</SelectItem>
                  <SelectItem value="SUPPLIER">SUPPLIER</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPartyCreateDialog(false)
                  setNewPartyName('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newPartyName.trim()) {
                    toast.error('Party name is required')
                    return
                  }
                  createPartyMutation.mutate({ name: newPartyName.trim(), partyType: newPartyType })
                }}
                disabled={createPartyMutation.isPending}
              >
                {createPartyMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Head Dialog */}
      <Dialog open={showHeadCreateDialog} onOpenChange={setShowHeadCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Head</DialogTitle>
            <DialogDescription>Create a new transaction category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newHeadName">Head Name *</Label>
              <Input
                id="newHeadName"
                value={newHeadName}
                onChange={(e) => setNewHeadName(e.target.value)}
                placeholder="Enter head name"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowHeadCreateDialog(false)
                  setNewHeadName('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newHeadName.trim()) {
                    toast.error('Head name is required')
                    return
                  }
                  createHeadMutation.mutate({ name: newHeadName.trim() })
                }}
                disabled={createHeadMutation.isPending}
              >
                {createHeadMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

