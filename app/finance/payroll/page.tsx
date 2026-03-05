'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import {
  calculateProRatedSalary,
  calculateEPF,
  calculateESIC,
  calculateTDSAmount,
  calculateNetPay,
  isESICApplicableByRule,
} from '@/lib/hrms/salary-calculation'
import { Edit, FileText, Search } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface Department {
  id: string
  name: string
}

interface Employee {
  id: string
  employeeCode: string
  joinDate: string | null
  salary: number | null
  designation: string | null
  panNumber: string | null
  bankAccountNumber: string | null
  uanNumber: string | null
  user: { id: string; name: string; email: string; role: string }
  department: { id: string; name: string } | null
}

interface SalaryStructure {
  id: string
  employeeId: string
  annualCtc: number
  monthlyGross: number
  basicSalary: number
  medicalAllowance: number
  conveyanceAllowance: number
  otherAllowance: number
  specialAllowance: number
  insuranceDeduction: number
  applyTds: boolean
  tdsMonthly: number
  tdsRatePercent: number | null
  effectiveFrom: string
  effectiveTo: string | null
  employee?: { id: string; employeeCode: string; user: { name: string }; department: { name: string } | null }
}

interface MonthlyPayroll {
  id: string
  employeeId: string
  month: number
  year: number
  status: string
  adjustedGross: number
  netPayable: number
  adjustedBasic?: number
  adjustedMedical?: number
  adjustedConveyance?: number
  adjustedOther?: number
  adjustedSpecial?: number
  epfEmployee?: number
  applyEsic?: boolean
  esicAmount?: number
  applyTds?: boolean
  tdsAmount?: number
  insurance?: number
  lateFines?: number
  totalDeductions?: number
  paidLeaves?: number
  employee?: { id: string; employeeCode: string; user: { name: string }; department: { name: string } | null }
}

interface AttendanceSummary {
  totalDaysInMonth: number
  fullDays: number
  halfDays: number
  paidLeaves: number
  unpaidLeaves: number
  payableDays: number
  lateFines: number
  normalizedDays?: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)
}

export default function FinancePayrollPage() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [salaryStructureDialogOpen, setSalaryStructureDialogOpen] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [selectedEmployeeForStructure, setSelectedEmployeeForStructure] = useState<Employee | null>(null)
  const [selectedEmployeeForGenerate, setSelectedEmployeeForGenerate] = useState<Employee | null>(null)
  const [createMore, setCreateMore] = useState(false)
  const [generateQueue, setGenerateQueue] = useState<Employee[]>([])
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set())

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees', departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (departmentFilter !== 'all') params.set('departmentId', departmentFilter)
      return apiGet<Employee[]>(`/api/employees?${params.toString()}`)
    },
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: structuresByEmployee } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structures'],
    queryFn: () => apiGet<SalaryStructure[]>('/api/finance/salary-structure'),
  })

  const payrollListRes = useQuery<{
    data: MonthlyPayroll[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>({
    queryKey: ['finance-payroll', month, year, departmentFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('month', String(month))
      params.set('year', String(year))
      if (departmentFilter !== 'all') params.set('departmentId', departmentFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return apiGet<{ data: MonthlyPayroll[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/finance/payroll?${params.toString()}`)
    },
  })

  const payrollRecords = payrollListRes.data?.data ?? []
  const payrollByEmployee = useMemo(() => {
    const map = new Map<string, MonthlyPayroll>()
    for (const p of payrollRecords) {
      map.set(p.employeeId, p)
    }
    return map
  }, [payrollRecords])

  const structureByEmployee = useMemo(() => {
    const map = new Map<string, SalaryStructure>()
    for (const s of structuresByEmployee ?? []) {
      const existing = map.get(s.employeeId)
      if (!existing || new Date(s.effectiveFrom) > new Date(existing.effectiveFrom)) {
        map.set(s.employeeId, s)
      }
    }
    return map
  }, [structuresByEmployee])

  const filteredEmployees = useMemo(() => {
    let list = employees
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.user.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.user.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [employees, searchQuery])

  const openSalaryStructure = (emp: Employee) => {
    setSelectedEmployeeForStructure(emp)
    setSalaryStructureDialogOpen(true)
  }

  const openGenerateModal = (emp: Employee, queue?: Employee[]) => {
    setSelectedEmployeeForGenerate(emp)
    setGenerateQueue(queue ?? filteredEmployees)
    setGenerateModalOpen(true)
  }

  const payrollIdsOnPage = useMemo(
    () => filteredEmployees.map((e) => payrollByEmployee.get(e.id)?.id).filter(Boolean) as string[],
    [filteredEmployees, payrollByEmployee]
  )
  const allSelected =
    payrollIdsOnPage.length > 0 && payrollIdsOnPage.every((id) => selectedPayrollIds.has(id))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPayrollIds((prev) => {
        const next = new Set(prev)
        payrollIdsOnPage.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedPayrollIds((prev) => {
        const next = new Set(prev)
        payrollIdsOnPage.forEach((id) => next.add(id))
        return next
      })
    }
  }
  const toggleSelectPayroll = (id: string) => {
    setSelectedPayrollIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground mt-1">Manage salary structures and generate monthly payroll</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || year)}
                  className="w-24"
                  min={2020}
                  max={2100}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedPayrollIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <span className="text-sm font-medium">{selectedPayrollIds.size} selected</span>
              <BulkStatusActions
                selectedIds={Array.from(selectedPayrollIds)}
                onDone={() => {
                  setSelectedPayrollIds(new Set())
                  queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPayrollIds(new Set())}
              >
                Clear selection
              </Button>
            </div>
          )}
          {employeesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {payrollIdsOnPage.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    )}
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Monthly Gross</TableHead>
                  <TableHead>Salary Structure</TableHead>
                  <TableHead>Payroll ({MONTHS[month - 1]} {year})</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const structure = structureByEmployee.get(emp.id)
                  const payroll = payrollByEmployee.get(emp.id)
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        {payroll && (
                          <Checkbox
                            checked={selectedPayrollIds.has(payroll.id)}
                            onCheckedChange={() => toggleSelectPayroll(payroll.id)}
                            aria-label={`Select ${emp.user.name}`}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{emp.user.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
                      </TableCell>
                      <TableCell>{emp.department?.name ?? '—'}</TableCell>
                      <TableCell>
                        {structure ? formatCurrency(structure.monthlyGross) : '—'}
                      </TableCell>
                      <TableCell>
                        {structure ? (
                          <Badge variant="secondary">Configured</Badge>
                        ) : (
                          <Badge variant="outline">Not set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payroll ? (
                          <Badge variant={payroll.status === 'PAID' ? 'default' : payroll.status === 'APPROVED' ? 'secondary' : 'outline'}>
                            {payroll.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openSalaryStructure(emp)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Structure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGenerateModal(emp)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {payroll ? 'View / Edit' : 'Generate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SalaryStructureDialog
        open={salaryStructureDialogOpen}
        onOpenChange={setSalaryStructureDialogOpen}
        employee={selectedEmployeeForStructure}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
          setSalaryStructureDialogOpen(false)
          setSelectedEmployeeForStructure(null)
        }}
      />

      <GeneratePayrollModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        employee={selectedEmployeeForGenerate}
        queue={generateQueue}
        month={month}
        year={year}
        createMore={createMore}
        setCreateMore={setCreateMore}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
          if (!createMore) {
            setGenerateModalOpen(false)
            setSelectedEmployeeForGenerate(null)
          } else {
            const idx = generateQueue.findIndex((e) => e.id === selectedEmployeeForGenerate?.id)
            const next = generateQueue[idx + 1]
            if (next) setSelectedEmployeeForGenerate(next)
            else {
              setGenerateModalOpen(false)
              setSelectedEmployeeForGenerate(null)
            }
          }
        }}
        onSkip={() => {
          const idx = generateQueue.findIndex((e) => e.id === selectedEmployeeForGenerate?.id)
          const next = generateQueue[idx + 1]
          if (next) setSelectedEmployeeForGenerate(next)
          else {
            setGenerateModalOpen(false)
            setSelectedEmployeeForGenerate(null)
          }
        }}
      />
    </div>
  )
}

function BulkStatusActions({
  selectedIds,
  onDone,
}: {
  selectedIds: string[]
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ status }: { status: 'DRAFT' | 'APPROVED' | 'PAID' }) =>
      apiPatch<{ updated: number }>('/api/finance/payroll/bulk-status', { ids: selectedIds, status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
      toast.success(`Status updated to ${status}`)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update status'),
  })
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => mutation.mutate({ status: 'APPROVED' })}
        disabled={mutation.isPending}
      >
        Approve selected
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => mutation.mutate({ status: 'PAID' })}
        disabled={mutation.isPending}
      >
        Mark as Paid
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => mutation.mutate({ status: 'DRAFT' })}
        disabled={mutation.isPending}
      >
        Set to Draft
      </Button>
    </div>
  )
}

function SalaryStructureDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee: Employee | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    annualCtc: '',
    basicSalary: '15000',
    medicalAllowance: '1500',
    conveyanceAllowance: '2150',
    otherAllowance: '0',
    insuranceDeduction: '0',
    applyTds: false,
    tdsMonthly: '0',
    tdsRatePercent: '' as string,
    effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
  })

  const { data: existingStructures = [] } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structure', employee?.id],
    queryFn: () => apiGet<SalaryStructure[]>(`/api/finance/salary-structure?employeeId=${employee?.id}`),
    enabled: !!employee?.id && open,
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<SalaryStructure>('/api/finance/salary-structure', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      queryClient.invalidateQueries({ queryKey: ['salary-structure-active'] })
      onSuccess()
      toast.success('Salary structure saved')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  })

  const monthlyGross = formData.annualCtc ? (Number(formData.annualCtc) / 12) : 0
  const other = Number(formData.otherAllowance) || 0
  const specialAllowance = Math.max(
    0,
    monthlyGross -
      (Number(formData.basicSalary) || 0) -
      (Number(formData.medicalAllowance) || 0) -
      (Number(formData.conveyanceAllowance) || 0) -
      other
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    const annualCtc = Number(formData.annualCtc)
    const basicSalary = Number(formData.basicSalary) || 0
    if (!annualCtc || annualCtc <= 0) {
      toast.error('Enter valid Annual CTC')
      return
    }
    if (specialAllowance < 0) {
      toast.error('Sum of components exceeds monthly gross')
      return
    }
    createMutation.mutate({
      employeeId: employee.id,
      annualCtc,
      basicSalary,
      medicalAllowance: Number(formData.medicalAllowance) || 0,
      conveyanceAllowance: Number(formData.conveyanceAllowance) || 0,
      otherAllowance: other,
      insuranceDeduction: Number(formData.insuranceDeduction) || 0,
      applyTds: formData.applyTds,
      tdsMonthly: Number(formData.tdsMonthly) || 0,
      tdsRatePercent: formData.tdsRatePercent ? Number(formData.tdsRatePercent) : null,
      effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
    })
  }

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salary Structure — {employee.user.name}</DialogTitle>
          <DialogDescription>Configure salary components. Special allowance is auto-calculated.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Annual CTC (₹)</Label>
              <Input
                type="number"
                value={formData.annualCtc}
                onChange={(e) => setFormData({ ...formData, annualCtc: e.target.value })}
                min={1}
                step={1}
              />
            </div>
            <div>
              <Label>Monthly Gross (read-only)</Label>
              <Input type="text" value={formatCurrency(monthlyGross)} readOnly className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Basic Salary (₹)</Label>
              <Input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                min={15000}
                step={100}
              />
            </div>
            <div>
              <Label>Medical Allowance (₹)</Label>
              <Input
                type="number"
                value={formData.medicalAllowance}
                onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })}
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Conveyance Allowance (₹)</Label>
              <Input
                type="number"
                value={formData.conveyanceAllowance}
                onChange={(e) => setFormData({ ...formData, conveyanceAllowance: e.target.value })}
                min={0}
              />
            </div>
            <div>
              <Label>Other Allowance (₹)</Label>
              <Input
                type="number"
                value={formData.otherAllowance}
                onChange={(e) => setFormData({ ...formData, otherAllowance: e.target.value })}
                min={0}
              />
            </div>
          </div>
          <div>
            <Label>Special Allowance (auto)</Label>
            <Input type="text" value={formatCurrency(specialAllowance)} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Insurance Deduction (₹)</Label>
            <Input
              type="number"
              value={formData.insuranceDeduction}
              onChange={(e) => setFormData({ ...formData, insuranceDeduction: e.target.value })}
              min={0}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Apply TDS for this employee</Label>
              <p className="text-xs text-muted-foreground">When on, TDS amount or rate is used in payroll.</p>
            </div>
            <Checkbox
              checked={formData.applyTds}
              onCheckedChange={(v) => setFormData({ ...formData, applyTds: !!v })}
            />
          </div>
          {formData.applyTds && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>TDS Fixed Monthly (₹)</Label>
                <Input
                  type="number"
                  value={formData.tdsMonthly}
                  onChange={(e) => setFormData({ ...formData, tdsMonthly: e.target.value })}
                  min={0}
                />
              </div>
              <div>
                <Label>TDS Rate % (e.g. 2)</Label>
                <Input
                  type="number"
                  value={formData.tdsRatePercent}
                  onChange={(e) => setFormData({ ...formData, tdsRatePercent: e.target.value })}
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
          <div>
            <Label>Effective From</Label>
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Structure'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GeneratePayrollModal({
  open,
  onOpenChange,
  employee,
  queue,
  month,
  year,
  createMore,
  setCreateMore,
  onSuccess,
  onSkip,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee: Employee | null
  queue: Employee[]
  month: number
  year: number
  createMore: boolean
  setCreateMore: (v: boolean) => void
  onSuccess: () => void
  onSkip: () => void
}) {
  const queryClient = useQueryClient()
  const currentIndex = employee ? queue.findIndex((e) => e.id === employee.id) + 1 : 0

  const { data: attendanceSummary, isLoading: attendanceLoading } = useQuery<AttendanceSummary>({
    queryKey: ['attendance-summary', employee?.id, month, year],
    queryFn: () =>
      apiGet<AttendanceSummary>(
        `/api/finance/payroll/attendance-summary?employeeId=${employee?.id}&month=${month}&year=${year}`
      ),
    enabled: !!employee?.id && open,
  })

  const { data: structure } = useQuery<SalaryStructure | null>({
    queryKey: ['salary-structure-active', employee?.id, month, year],
    queryFn: async () => {
      const list = await apiGet<SalaryStructure[]>(`/api/finance/salary-structure?employeeId=${employee?.id}`)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      const active = list
        .filter((s) => {
          const from = new Date(s.effectiveFrom)
          const to = s.effectiveTo ? new Date(s.effectiveTo) : null
          return from <= monthEnd && (!to || to >= monthStart)
        })
        .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0]
      return active ?? null
    },
    enabled: !!employee?.id && open,
  })

  const { data: existingPayroll } = useQuery<MonthlyPayroll | null>({
    queryKey: ['payroll-record', employee?.id, month, year],
    queryFn: async () => {
      const res = await apiGet<{ data: MonthlyPayroll[] }>(
        `/api/finance/payroll?employeeId=${employee?.id}&month=${month}&year=${year}`
      )
      return res.data?.[0] ?? null
    },
    enabled: !!employee?.id && open,
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      apiPost<MonthlyPayroll>('/api/finance/payroll/generate', {
        employeeId: employee!.id,
        month,
        year,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-record', employee?.id, month, year] })
      toast.success('Payroll generated')
      onSuccess()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to generate'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPatch<MonthlyPayroll>(`/api/finance/payroll/${existingPayroll!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
      toast.success('Payroll updated')
      onSuccess()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update'),
  })

  const [employeeDetails, setEmployeeDetails] = useState({
    designation: '',
    panNumber: '',
    bankAccountNumber: '',
    uanNumber: '',
    joinDate: '',
  })

  useEffect(() => {
    if (employee) {
      setEmployeeDetails({
        designation: employee.designation ?? '',
        panNumber: employee.panNumber ?? '',
        bankAccountNumber: employee.bankAccountNumber ?? '',
        uanNumber: employee.uanNumber ?? '',
        joinDate: employee.joinDate ? format(new Date(employee.joinDate), 'yyyy-MM-dd') : '',
      })
    }
  }, [employee?.id])

  const updateEmployeeMutation = useMutation({
    mutationFn: (data: { designation?: string; panNumber?: string; bankAccountNumber?: string; uanNumber?: string; joinDate?: string }) =>
      apiPatch<Employee>(`/api/employees/${employee!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] })
      toast.success('Employee details saved')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save details'),
  })

  const handleSaveEmployeeDetails = () => {
    if (!employee) return
    updateEmployeeMutation.mutate({
      designation: employeeDetails.designation.trim() || undefined,
      panNumber: employeeDetails.panNumber.trim() || undefined,
      bankAccountNumber: employeeDetails.bankAccountNumber.trim() || undefined,
      uanNumber: employeeDetails.uanNumber.trim() || undefined,
      joinDate: employeeDetails.joinDate ? new Date(employeeDetails.joinDate).toISOString() : undefined,
    })
  }

  const [formData, setFormData] = useState({
    adjustedBasic: 0,
    adjustedMedical: 0,
    adjustedConveyance: 0,
    adjustedOther: 0,
    adjustedSpecial: 0,
    adjustedGross: 0,
    epfEmployee: 0,
    applyEsic: false,
    esicAmount: 0,
    applyTds: false,
    tdsAmount: 0,
    insurance: 0,
    lateFines: 0,
    netPayable: 0,
    status: 'DRAFT' as 'DRAFT' | 'APPROVED' | 'PAID',
  })

  const previewData = useMemo(() => {
    if (existingPayroll || !structure || !attendanceSummary) return null
    const totalDays = attendanceSummary.totalDaysInMonth
    const payableDays = attendanceSummary.payableDays
    const breakup = {
      basicSalary: structure.basicSalary,
      medicalAllowance: structure.medicalAllowance,
      conveyanceAllowance: structure.conveyanceAllowance,
      otherAllowance: structure.otherAllowance,
      specialAllowance: structure.specialAllowance,
      monthlyGross: structure.monthlyGross,
    }
    const proRated = calculateProRatedSalary(breakup, payableDays, totalDays)
    const epfEmployee = calculateEPF(proRated.adjustedBasic)
    const applyEsic = isESICApplicableByRule(structure.monthlyGross)
    const esicAmount = applyEsic ? calculateESIC(proRated.adjustedGross, structure.monthlyGross) : 0
    const tdsAmount = structure.applyTds
      ? calculateTDSAmount(proRated.adjustedGross, structure.tdsMonthly, structure.tdsRatePercent ?? null)
      : 0
    const insurance = structure.insuranceDeduction ?? 0
    const lateFines = attendanceSummary.lateFines ?? 0
    const netBeforeLate = calculateNetPay(
      proRated.adjustedGross,
      epfEmployee,
      esicAmount,
      insurance,
      tdsAmount
    )
    const netPayable = Math.max(0, Math.round(netBeforeLate - lateFines))
    return {
      ...proRated,
      epfEmployee,
      applyEsic,
      esicAmount,
      applyTds: structure.applyTds,
      tdsAmount,
      insurance,
      lateFines,
      netPayable,
    }
  }, [existingPayroll, structure, attendanceSummary])

  useEffect(() => {
    if (existingPayroll) {
      setFormData({
        adjustedBasic: existingPayroll.adjustedBasic ?? 0,
        adjustedMedical: existingPayroll.adjustedMedical ?? 0,
        adjustedConveyance: existingPayroll.adjustedConveyance ?? 0,
        adjustedOther: existingPayroll.adjustedOther ?? 0,
        adjustedSpecial: existingPayroll.adjustedSpecial ?? 0,
        adjustedGross: existingPayroll.adjustedGross ?? 0,
        epfEmployee: existingPayroll.epfEmployee ?? 0,
        applyEsic: existingPayroll.applyEsic ?? false,
        esicAmount: existingPayroll.esicAmount ?? 0,
        applyTds: existingPayroll.applyTds ?? false,
        tdsAmount: existingPayroll.tdsAmount ?? 0,
        insurance: existingPayroll.insurance ?? 0,
        lateFines: existingPayroll.lateFines ?? 0,
        netPayable: existingPayroll.netPayable ?? 0,
        status: (existingPayroll.status as 'DRAFT' | 'APPROVED' | 'PAID') || 'DRAFT',
      })
    }
  }, [existingPayroll?.id])

  if (!employee) return null

  const hasStructure = !!structure
  const hasPayroll = !!existingPayroll
  const payroll = existingPayroll

  const canEdit = hasPayroll
  const displayData = hasPayroll
    ? {
        adjustedBasic: formData.adjustedBasic || payroll!.adjustedBasic,
        adjustedMedical: formData.adjustedMedical ?? payroll!.adjustedMedical,
        adjustedConveyance: formData.adjustedConveyance ?? payroll!.adjustedConveyance,
        adjustedOther: formData.adjustedOther ?? payroll!.adjustedOther,
        adjustedSpecial: formData.adjustedSpecial ?? payroll!.adjustedSpecial,
        adjustedGross: formData.adjustedGross || payroll!.adjustedGross,
        epfEmployee: formData.epfEmployee ?? payroll!.epfEmployee,
        applyEsic: formData.applyEsic !== undefined ? formData.applyEsic : payroll!.applyEsic,
        esicAmount: formData.esicAmount ?? payroll!.esicAmount,
        applyTds: formData.applyTds !== undefined ? formData.applyTds : payroll!.applyTds,
        tdsAmount: formData.tdsAmount ?? payroll!.tdsAmount,
        insurance: formData.insurance ?? payroll!.insurance,
        lateFines: formData.lateFines ?? payroll!.lateFines,
        netPayable: formData.netPayable || payroll!.netPayable,
        status: formData.status,
      }
    : previewData
    ? {
        ...previewData,
        status: 'DRAFT' as const,
      }
    : formData

  const handleGenerate = () => {
    if (!hasStructure) {
      toast.error('Set salary structure first')
      return
    }
    generateMutation.mutate()
  }

  const handleSave = () => {
    if (!payroll) return
    updateMutation.mutate({
      adjustedBasic: displayData.adjustedBasic,
      adjustedMedical: displayData.adjustedMedical,
      adjustedConveyance: displayData.adjustedConveyance,
      adjustedOther: displayData.adjustedOther,
      adjustedSpecial: displayData.adjustedSpecial,
      adjustedGross: displayData.adjustedGross,
      epfEmployee: displayData.epfEmployee,
      applyEsic: displayData.applyEsic,
      esicAmount: displayData.esicAmount,
      applyTds: displayData.applyTds,
      tdsAmount: displayData.tdsAmount,
      insurance: displayData.insurance,
      lateFines: displayData.lateFines ?? 0,
      status: formData.status,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {hasPayroll ? 'View / Edit Payroll' : 'Generate Payroll'} — {employee.user.name}
          </DialogTitle>
          <DialogDescription>
            {MONTHS[month - 1]} {year}. {queue.length > 0 && `Employee ${currentIndex} of ${queue.length}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Employee details</CardTitle>
              <CardDescription>These appear on the salary slip. Edit and save as needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee name</Label>
                  <Input value={employee.user.name} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Employee ID</Label>
                  <Input value={employee.employeeCode} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input
                    value={employeeDetails.designation}
                    onChange={(e) => setEmployeeDetails((d) => ({ ...d, designation: e.target.value }))}
                    placeholder="e.g. Software Developer"
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input value={employee.department?.name ?? '—'} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Date of joining</Label>
                  <Input
                    type="date"
                    value={employeeDetails.joinDate}
                    onChange={(e) => setEmployeeDetails((d) => ({ ...d, joinDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>PAN number</Label>
                  <Input
                    value={employeeDetails.panNumber}
                    onChange={(e) => setEmployeeDetails((d) => ({ ...d, panNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AAAAA9999A"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label>Bank account number</Label>
                  <Input
                    value={employeeDetails.bankAccountNumber}
                    onChange={(e) => setEmployeeDetails((d) => ({ ...d, bankAccountNumber: e.target.value }))}
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <Label>UAN number</Label>
                  <Input
                    value={employeeDetails.uanNumber}
                    onChange={(e) => setEmployeeDetails((d) => ({ ...d, uanNumber: e.target.value }))}
                    placeholder="EPF UAN"
                  />
                </div>
                <div>
                  <Label>Monthly gross</Label>
                  <Input value={structure ? formatCurrency(structure.monthlyGross) : '—'} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Annual CTC</Label>
                  <Input value={structure ? formatCurrency(structure.annualCtc) : '—'} readOnly className="bg-muted" />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveEmployeeDetails}
                disabled={updateEmployeeMutation.isPending}
              >
                {updateEmployeeMutation.isPending ? 'Saving...' : 'Save employee details'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {attendanceLoading ? (
                <p className="text-muted-foreground">Loading attendance...</p>
              ) : attendanceSummary ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>Total days (month)</div>
                  <div>{attendanceSummary.totalDaysInMonth}</div>
                  <div>Full days worked</div>
                  <div>{attendanceSummary.fullDays}</div>
                  <div>Half days</div>
                  <div>{attendanceSummary.halfDays}</div>
                  <div>Paid leaves</div>
                  <div>{attendanceSummary.paidLeaves ?? 0}</div>
                  <div>Unpaid leaves</div>
                  <div>{attendanceSummary.unpaidLeaves}</div>
                  <div>Payable days</div>
                  <div className="font-medium">{attendanceSummary.payableDays}</div>
                  <div>Late fines (Rs.)</div>
                  <div>{attendanceSummary.lateFines ?? 0}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">No attendance data for this month.</p>
              )}
            </CardContent>
          </Card>

          {!hasStructure && (
            <p className="text-amber-600 text-sm">Configure salary structure first to generate payroll.</p>
          )}

          {(hasPayroll || previewData) && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Earnings & Deductions</CardTitle>
                {previewData && !hasPayroll && (
                  <p className="text-xs text-muted-foreground">Preview — generate to save. You can edit after generating.</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Adjusted Basic (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedBasic ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedBasic: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Adjusted Medical (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedMedical ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedMedical: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Adjusted Conveyance (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedConveyance ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedConveyance: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Adjusted Other (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedOther ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedOther: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Adjusted Special (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedSpecial ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedSpecial: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Adjusted Gross (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.adjustedGross ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, adjustedGross: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>EPF Employee (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.epfEmployee ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, epfEmployee: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Apply ESIC</Label>
                    <p className="text-xs text-muted-foreground">Override rule (gross ≤ 21,100).</p>
                  </div>
                  <Checkbox
                    checked={displayData.applyEsic}
                    onCheckedChange={(v) => setFormData((f) => ({ ...f, applyEsic: !!v }))}
                    disabled={!canEdit}
                  />
                </div>
                {displayData.applyEsic && (
                  <div>
                    <Label>ESIC Amount (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.esicAmount ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, esicAmount: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Apply TDS</Label>
                  </div>
                  <Checkbox
                    checked={displayData.applyTds}
                    onCheckedChange={(v) => setFormData((f) => ({ ...f, applyTds: !!v }))}
                    disabled={!canEdit}
                  />
                </div>
                {displayData.applyTds && (
                  <div>
                    <Label>TDS Amount (₹)</Label>
                    <Input
                      type="number"
                      value={displayData.tdsAmount ?? 0}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, tdsAmount: Number(e.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                )}
                <div>
                  <Label>Insurance (Rs.)</Label>
                  <Input
                    type="number"
                    value={displayData.insurance ?? 0}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, insurance: Number(e.target.value) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label>Late fines (Rs.)</Label>
                  <Input
                    type="number"
                    value={displayData.lateFines ?? 0}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, lateFines: Number(e.target.value) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label>Net Payable (Rs.)</Label>
                  <Input
                    type="text"
                    value={formatCurrency(displayData.netPayable ?? (payroll?.netPayable ?? 0))}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                {hasPayroll && (
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: 'DRAFT' | 'APPROVED' | 'PAID') =>
                        setFormData((f) => ({ ...f, status: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Create more</Label>
              <p className="text-xs text-muted-foreground">After save, load next employee in queue.</p>
            </div>
            <Checkbox checked={createMore} onCheckedChange={(v) => setCreateMore(!!v)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {!hasPayroll && hasStructure && (
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? 'Generating...' : 'Generate Payroll'}
              </Button>
            )}
            {hasPayroll && (
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            {createMore && queue.length > 1 && (
              <Button variant="outline" onClick={onSkip}>
                Skip to next
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
