'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { Plus, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface Employee {
  id: string
  employeeCode: string
  user: {
    id: string
    name: string
    email: string
  }
  department: {
    id: string
    name: string
  } | null
}

interface PayrollComponent {
  componentType: 'ALLOWANCE' | 'DEDUCTION'
  name: string
  amount: number
}

interface PayrollRecord {
  id: string
  employee: Employee
  month: number
  year: number
  disbursedAt: Date
  basicSalary: number
  grossSalary: number
  netSalary: number
  status: string
  components: Array<{
    id: string
    componentType: 'ALLOWANCE' | 'DEDUCTION'
    name: string
    amount: number
  }>
}

interface PayrollData {
  data: PayrollRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function HRPayrollPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiGet<Employee[]>('/api/employees'),
  })

  const { data: payrollData, isLoading } = useQuery<PayrollData>({
    queryKey: ['payroll'],
    queryFn: () => apiGet<PayrollData>('/api/payroll'),
  })

  const createPayrollMutation = useMutation({
    mutationFn: (data: {
      employeeId: string
      month: number
      year: number
      disbursedAt: string
      basicSalary: number
      components: PayrollComponent[]
    }) => apiPost<PayrollRecord>('/api/payroll', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setIsDialogOpen(false)
      toast.success('Payroll record created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create payroll record')
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    return months[month - 1] || ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage payroll records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Payroll Record</DialogTitle>
              <DialogDescription>Create a new payroll record for an employee</DialogDescription>
            </DialogHeader>
            <CreatePayrollForm
              employees={employees || []}
              onSubmit={(data) => createPayrollMutation.mutate(data)}
              isLoading={createPayrollMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            Total: {payrollData?.pagination.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData?.data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.employee.user.name}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {record.employee.employeeCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {getMonthName(record.month)}
                      </div>
                    </TableCell>
                    <TableCell>{record.year}</TableCell>
                    <TableCell>
                      {format(new Date(record.disbursedAt), 'PPP')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(record.basicSalary)}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(record.grossSalary)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(record.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{record.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!payrollData?.data || payrollData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No payroll records found
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

function CreatePayrollForm({
  employees,
  onSubmit,
  isLoading,
}: {
  employees: Employee[]
  onSubmit: (data: {
    employeeId: string
    month: number
    year: number
    disbursedAt: string
    basicSalary: number
    components: PayrollComponent[]
  }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    disbursedAt: format(new Date(), 'yyyy-MM-dd'),
    basicSalary: '' as string | number,
    components: [] as PayrollComponent[],
  })

  const [newComponent, setNewComponent] = useState({
    componentType: 'ALLOWANCE' as 'ALLOWANCE' | 'DEDUCTION',
    name: '',
    amount: '' as string | number,
  })

  const addComponent = () => {
    const amount = typeof newComponent.amount === 'number' ? newComponent.amount : (newComponent.amount === '' ? 0 : parseFloat(String(newComponent.amount)) || 0)
    if (newComponent.name && amount > 0) {
      setFormData({
        ...formData,
        components: [...formData.components, { ...newComponent, amount }],
      })
      setNewComponent({ componentType: 'ALLOWANCE', name: '', amount: '' })
    }
  }

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_, i) => i !== index),
    })
  }

  const calculateTotals = () => {
    const basicSalary = typeof formData.basicSalary === 'number' 
      ? formData.basicSalary 
      : (formData.basicSalary === '' ? 0 : parseFloat(String(formData.basicSalary)) || 0)
    const allowances = formData.components
      .filter((c) => c.componentType === 'ALLOWANCE')
      .reduce((sum, c) => sum + (c.amount || 0), 0)
    const deductions = formData.components
      .filter((c) => c.componentType === 'DEDUCTION')
      .reduce((sum, c) => sum + (c.amount || 0), 0)
    const grossSalary = basicSalary + allowances
    const netSalary = grossSalary - deductions
    return { allowances, deductions, grossSalary, netSalary, basicSalary }
  }

  const totals = calculateTotals()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const basicSalary = typeof formData.basicSalary === 'number' 
      ? formData.basicSalary 
      : (formData.basicSalary === '' ? 0 : parseFloat(String(formData.basicSalary)) || 0)
    onSubmit({
      ...formData,
      basicSalary,
      disbursedAt: new Date(formData.disbursedAt).toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Employee</Label>
          <Select
            value={formData.employeeId}
            onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.user.name} ({emp.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Disbursed Date</Label>
          <Input
            type="date"
            value={formData.disbursedAt}
            onChange={(e) => setFormData({ ...formData, disbursedAt: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Month</Label>
          <Select
            value={formData.month.toString()}
            onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) || 1 })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {getMonthName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Input
            type="number"
            value={formData.year || ''}
            onChange={(e) => {
              const val = e.target.value
              const numVal = val === '' ? new Date().getFullYear() : (parseInt(val) || new Date().getFullYear())
              setFormData({ ...formData, year: numVal })
            }}
            required
            min={2000}
            max={2100}
          />
        </div>
        <div>
          <Label>Basic Salary</Label>
          <Input
            type="number"
            value={formData.basicSalary === '' ? '' : formData.basicSalary}
            onChange={(e) => {
              const val = e.target.value
              setFormData({ ...formData, basicSalary: val === '' ? '' : (parseFloat(val) || 0) })
            }}
            required
            min={0}
            step="0.01"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label>Components (Allowances & Deductions)</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <Select
            value={newComponent.componentType}
            onValueChange={(value) =>
              setNewComponent({ ...newComponent, componentType: value as 'ALLOWANCE' | 'DEDUCTION' })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALLOWANCE">Allowance</SelectItem>
              <SelectItem value="DEDUCTION">Deduction</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Component name"
            value={newComponent.name}
            onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Amount"
            value={newComponent.amount === '' ? '' : newComponent.amount}
            onChange={(e) => {
              const val = e.target.value
              setNewComponent({ ...newComponent, amount: val === '' ? '' : (parseFloat(val) || 0) })
            }}
            min={0}
            step="0.01"
          />
          <Button type="button" onClick={addComponent} variant="outline">
            Add
          </Button>
        </div>

        {formData.components.length > 0 && (
          <div className="mt-4 space-y-2">
            {formData.components.map((comp, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="flex-1">
                  {comp.componentType === 'ALLOWANCE' ? '+' : '-'} {comp.name}: {formatCurrency(comp.amount)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeComponent(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Basic Salary:</span>
          <span>{formatCurrency(totals.basicSalary)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Allowances:</span>
          <span className="text-green-600">+{formatCurrency(totals.allowances)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Deductions:</span>
          <span className="text-red-600">-{formatCurrency(totals.deductions)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Gross Salary:</span>
          <span>{formatCurrency(totals.grossSalary)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Net Salary:</span>
          <span>{formatCurrency(totals.netSalary)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Payroll'}
        </Button>
      </div>
    </form>
  )
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return months[month - 1] || ''
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

