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
import { ArrowLeft, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react'
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
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [formData, setFormData] = useState({
    partyId: '',
    description: '',
    headId: '',
    paymentTypeId: '',
    paymentModeId: '',
    amount: '',
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

  const createMutation = useMutation({
    mutationFn: (data: {
      transactionType: string
      transactionDate: string
      partyId: string
      description: string
      headId: string
      paymentTypeId: string
      paymentModeId: string
      paymentAmount?: number
      receivedAmount?: number
    }) => apiPost('/api/finance/ledger', data),
    onSuccess: () => {
      if (transactionType === 'CREDIT') {
        toast.success('Credit entry created and auto-approved!')
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
      ...(transactionType === 'CREDIT' ? { receivedAmount: amount } : { paymentAmount: amount }),
    }

    createMutation.mutate(data)
  }

  // Calculate balance impact preview
  const amount = parseFloat(formData.amount) || 0
  const currentBalance = selectedPaymentMode?.currentBalance || 0
  const projectedBalance = transactionType === 'CREDIT'
    ? currentBalance + amount
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
          <div className="grid grid-cols-2 gap-4">
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Payment Purpose / Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Website development, Sales commission, Office rent"
                rows={2}
                required
              />
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

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                {transactionType === 'CREDIT' ? 'Received Amount' : 'Payment Amount'} *
              </Label>
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

            {/* Payment Mode */}
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

            {/* Balance Impact Preview */}
            {formData.paymentModeId && formData.amount && (
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
                      <div className="font-mono font-semibold">{formatCurrency(projectedBalance)}</div>
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
                className={transactionType === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {createMutation.isPending ? 'Creating...' : 
                  transactionType === 'CREDIT' ? 'Create & Auto-Approve' : 'Create (Pending Approval)'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

