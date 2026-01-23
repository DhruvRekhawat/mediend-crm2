'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { ArrowLeft, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, AlertCircle, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

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
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function NewLedgerEntryPage() {
  const router = useRouter()
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT' | 'SELF_TRANSFER'>('CREDIT')
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
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
      const componentA = parseFloat(formData.componentA)
      const componentB = parseFloat(formData.componentB) || 0

      if (isNaN(componentA) || componentA <= 0) {
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
        componentA,
        componentB: componentB > 0 ? componentB : undefined,
      }

      createMutation.mutate(data)
    }
  }

  // Calculate balance impact preview
  const amount = transactionType === 'CREDIT' 
    ? (parseFloat(formData.amount) || 0)
    : transactionType === 'SELF_TRANSFER'
    ? (parseFloat(formData.transferAmount) || 0)
    : ((parseFloat(formData.componentA) || 0) + (parseFloat(formData.componentB) || 0))
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
                  <Select
                    value={formData.partyId}
                    onValueChange={(value) => setFormData({ ...formData, partyId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      {partiesData?.data.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name} ({party.partyType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Head */}
                <div className="space-y-2">
                  <Label htmlFor="head">Head *</Label>
                  <Select
                    value={formData.headId}
                    onValueChange={(value) => setFormData({ ...formData, headId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select head" />
                    </SelectTrigger>
                    <SelectContent>
                      {headsData?.data.map((head) => (
                        <SelectItem key={head.id} value={head.id}>
                          {head.name} {head.department && `(${head.department})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type */}
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Type of Payment *</Label>
                  <Select
                    value={formData.paymentTypeId}
                    onValueChange={(value) => setFormData({ ...formData, paymentTypeId: value })}
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
                      step="0.01"
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
                    step="0.01"
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
                <div className="space-y-2">
                  <Label htmlFor="componentA">Component A (Main Expense) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="componentA"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.componentA}
                      onChange={(e) => setFormData({ ...formData, componentA: e.target.value })}
                      className="pl-8"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">The main expense amount (more relevant)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="componentB">Component B (Claimable Amount)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="componentB"
                      type="number"
                      min="0"
                      step="0.01"
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
                      ₹{((parseFloat(formData.componentA) || 0) + (parseFloat(formData.componentB) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground">
                    <span>Component A: ₹{(parseFloat(formData.componentA) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

            {transactionType !== 'SELF_TRANSFER' && formData.paymentModeId && (formData.amount || formData.componentA) && (
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
    </div>
  )
}

