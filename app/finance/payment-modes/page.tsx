'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { Plus, Pencil, Search, Wallet, TrendingUp, TrendingDown, CalendarIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface PaymentMode {
  id: string
  name: string
  description: string | null
  openingBalance: number
  currentBalance: number
  projectedBalance?: number
  isActive: boolean
  createdAt: string
}

interface PaymentModesResponse {
  data: PaymentMode[]
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

export default function PaymentModesPage() {
  const [search, setSearch] = useState('')
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMode, setEditingMode] = useState<PaymentMode | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    openingBalance: 0,
  })

  const queryClient = useQueryClient()

  const { data: modesData, isLoading } = useQuery<PaymentModesResponse>({
    queryKey: ['payment-modes', search, asOfDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (asOfDate) {
        // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
        const year = asOfDate.getFullYear()
        const month = String(asOfDate.getMonth() + 1).padStart(2, '0')
        const day = String(asOfDate.getDate()).padStart(2, '0')
        params.set('asOfDate', `${year}-${month}-${day}`)
      }
      return apiGet<PaymentModesResponse>(`/api/finance/payment-modes?${params.toString()}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiPost('/api/finance/payment-modes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-modes'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Payment mode created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create payment mode')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; isActive?: boolean } }) =>
      apiPatch(`/api/finance/payment-modes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-modes'] })
      setIsDialogOpen(false)
      setEditingMode(null)
      resetForm()
      toast.success('Payment mode updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payment mode')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      openingBalance: 0,
    })
  }

  const handleEdit = (mode: PaymentMode) => {
    setEditingMode(mode)
    setFormData({
      name: mode.name,
      description: mode.description || '',
      openingBalance: mode.openingBalance,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMode) {
      // Note: Cannot edit opening balance after creation
      updateMutation.mutate({
        id: editingMode.id,
        data: { name: formData.name, description: formData.description },
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleActive = (mode: PaymentMode) => {
    updateMutation.mutate({ id: mode.id, data: { isActive: !mode.isActive } })
  }

  // Calculate totals
  const totalBalance = modesData?.data.reduce((sum, m) => sum + m.currentBalance, 0) || 0
  const totalProjectedBalance = modesData?.data.reduce((sum, m) => sum + (m.projectedBalance ?? m.currentBalance), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Mode Master</h1>
          <p className="text-muted-foreground mt-1">Manage bank accounts and cash with balances</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingMode(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Mode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMode ? 'Edit Payment Mode' : 'Add New Payment Mode'}</DialogTitle>
              <DialogDescription>
                {editingMode
                  ? 'Update payment mode details (balance cannot be edited)'
                  : 'Create a new payment mode with opening balance'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Payment Mode Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ICICI Bank, SBI Bank, Cash"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Account number, branch, etc."
                />
              </div>
              {!editingMode && (
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance *</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be the starting balance. Cannot be changed after creation.
                  </p>
                </div>
              )}
              {editingMode && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Opening Balance: <strong>{formatCurrency(editingMode.openingBalance)}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current Balance: <strong>{formatCurrency(editingMode.currentBalance)}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Balances are managed through ledger transactions and cannot be edited directly.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingMode(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingMode ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">
                  {asOfDate ? `Total Balance as of ${format(asOfDate, 'dd MMM yyyy')}` : 'Total Balance (All Active Modes)'}
                </p>
                <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
              <Wallet className="h-12 w-12 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        {!asOfDate && (
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">
                    Projected Balance (If All Debits Approved)
                  </p>
                  <p className="text-3xl font-bold">{formatCurrency(totalProjectedBalance)}</p>
                  <p className="text-blue-100 text-xs mt-1">
                    Difference: {formatCurrency(totalProjectedBalance - totalBalance)}
                  </p>
                </div>
                <TrendingDown className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[200px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {asOfDate ? format(asOfDate, 'dd MMM yyyy') : 'Select date for opening balance'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={(date) => {
                      setAsOfDate(date)
                      setShowCalendar(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
              {asOfDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAsOfDate(undefined)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Modes</CardTitle>
          <CardDescription>Total: {modesData?.pagination.total || 0} payment modes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead className="text-right">
                    {asOfDate ? `Opening Balance (as of ${format(asOfDate, 'dd MMM yyyy')})` : 'Opening Balance'}
                  </TableHead>
                  <TableHead className="text-right">
                    {asOfDate ? `Balance (as of ${format(asOfDate, 'dd MMM yyyy')})` : 'Current Balance'}
                  </TableHead>
                  {!asOfDate && (
                    <TableHead className="text-right">Projected Balance</TableHead>
                  )}
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modesData?.data.map((mode) => {
                  const change = mode.currentBalance - mode.openingBalance
                  const isPositive = change >= 0
                  const projectedBalance = mode.projectedBalance ?? mode.currentBalance
                  const projectedChange = projectedBalance - mode.currentBalance
                  return (
                    <TableRow key={mode.id}>
                      <TableCell className="font-medium">{mode.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {mode.description || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(mode.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(mode.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(mode.currentBalance)}
                      </TableCell>
                      {!asOfDate && (
                        <TableCell className="text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span className={`font-semibold ${projectedChange < 0 ? 'text-red-600' : projectedChange > 0 ? 'text-green-600' : ''}`}>
                              {formatCurrency(projectedBalance)}
                            </span>
                            {projectedChange !== 0 && (
                              <span className={`text-xs ${projectedChange < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {projectedChange < 0 ? '↓' : '↑'} {formatCurrency(Math.abs(projectedChange))}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {!asOfDate && (
                          <div
                            className={`flex items-center justify-end gap-1 ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-mono">{formatCurrency(Math.abs(change))}</span>
                          </div>
                        )}
                        {asOfDate && <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mode.isActive ? 'default' : 'secondary'}>
                          {mode.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(mode)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(mode)}
                          >
                            {mode.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!modesData?.data || modesData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={asOfDate ? 8 : 9} className="text-center text-muted-foreground py-8">
                      No payment modes found
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

