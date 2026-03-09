'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { Edit, FileText, Search, Users, IndianRupee, Clock, Download } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import type { Department, Employee, SalaryStructure, MonthlyPayroll } from '@/lib/finance/payroll-types'
import { MONTHS, formatCurrency } from '@/lib/finance/payroll-types'

export default function FinancePayrollPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const now = new Date()
  // Default to previous month: March's payroll is done in April, etc.
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const [month, setMonth] = useState(prevMonth)
  const [year, setYear] = useState(prevYear)
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [salaryStructureDialogOpen, setSalaryStructureDialogOpen] = useState(false)
  const [selectedEmployeeForStructure, setSelectedEmployeeForStructure] = useState<Employee | null>(null)
  const [structureMore, setStructureMore] = useState(false)
  const [structureQueue, setStructureQueue] = useState<Employee[]>([])
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set())
  const [exportCsvLoading, setExportCsvLoading] = useState(false)

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
      const sEff = new Date(s.effectiveFrom).getTime()
      const exEff = existing ? new Date(existing.effectiveFrom).getTime() : 0
      const sCreated = new Date(s.createdAt ?? 0).getTime()
      const exCreated = existing ? new Date(existing.createdAt ?? 0).getTime() : 0
      if (!existing || sEff > exEff || (sEff === exEff && sCreated > exCreated)) {
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

  const kpiStats = useMemo(() => {
    const totalEmployees = filteredEmployees.length
    const payrollGenerated = filteredEmployees.filter((e) => payrollByEmployee.has(e.id)).length
    const totalNetCost = payrollRecords.reduce((sum, p) => sum + (p.netPayable ?? 0), 0)
    const pendingDraft = payrollRecords.filter((p) => p.status === 'DRAFT').length
    return { totalEmployees, payrollGenerated, totalNetCost, pendingDraft }
  }, [filteredEmployees, payrollByEmployee, payrollRecords])

  const openSalaryStructure = (emp: Employee, queue?: Employee[]) => {
    setSelectedEmployeeForStructure(emp)
    setStructureQueue(queue ?? filteredEmployees)
    setSalaryStructureDialogOpen(true)
  }

  const employeesToShow = useMemo(() => {
    if (statusFilter === 'all') return filteredEmployees
    return filteredEmployees.filter((emp) => payrollByEmployee.has(emp.id))
  }, [filteredEmployees, payrollByEmployee, statusFilter])

  const payrollIdsOnPage = useMemo(
    () => employeesToShow.map((e) => payrollByEmployee.get(e.id)?.id).filter(Boolean) as string[],
    [employeesToShow, payrollByEmployee]
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

  const handleExportCsv = async () => {
    if (selectedPayrollIds.size === 0) return
    setExportCsvLoading(true)
    try {
      const ids = Array.from(selectedPayrollIds).join(',')
      const today = format(new Date(), 'yyyy-MM-dd')
      const url = `/api/finance/payroll/export-csv?ids=${encodeURIComponent(ids)}&transactionDate=${encodeURIComponent(today)}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Export failed: ${res.status}`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] ?? `payroll-bank-export-${format(new Date(), 'dd-MM-yyyy')}.csv`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('CSV downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export CSV')
    } finally {
      setExportCsvLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground mt-1">Manage salary structures and generate monthly payroll</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{kpiStats.totalEmployees}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payroll Generated</p>
              <p className="text-2xl font-bold">{kpiStats.payrollGenerated}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <IndianRupee className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Net Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(kpiStats.totalNetCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending (Draft)</p>
              <p className="text-2xl font-bold">{kpiStats.pendingDraft}</p>
            </div>
          </CardContent>
        </Card>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={exportCsvLoading}
              >
                <Download className="h-4 w-4 mr-1" />
                {exportCsvLoading ? 'Exporting...' : 'Export for bank (CSV)'}
              </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Monthly Gross</TableHead>
                  <TableHead>Salary Structure</TableHead>
                  <TableHead>Payroll</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                {employeesToShow.map((emp, idx) => {
                  const structure = structureByEmployee.get(emp.id)
                  const payroll = payrollByEmployee.get(emp.id)
                  return (
                    <TableRow
                      key={emp.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/60 ${idx % 2 === 1 ? 'bg-muted/40' : ''}`}
                      onClick={() => {
                        const params = new URLSearchParams({
                          employeeId: emp.id,
                          month: String(month),
                          year: String(year),
                          queue: employeesToShow.map((e) => e.id).join(','),
                        })
                        router.push(`/finance/payroll/generate?${params.toString()}`)
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                          {emp.department?.name ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {structure ? formatCurrency(Math.ceil(structure.monthlyGross)) : '—'}
                      </TableCell>
                      <TableCell>
                        {structure ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Configured</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Not set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payroll ? (
                          <Badge
                            className={
                              payroll.status === 'PAID'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : payroll.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }
                          >
                            {payroll.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openSalaryStructure(emp); }}>
                            <Edit className="h-4 w-4 mr-1" />
                            Structure
                          </Button>
                          <Link
                            href={`/finance/payroll/generate?employeeId=${emp.id}&month=${month}&year=${year}&queue=${employeesToShow.map((e) => e.id).join(',')}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {payroll ? 'View / Edit' : 'Generate'}
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {employeesToShow.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {statusFilter !== 'all' ? 'No payroll records with this status' : 'No employees found'}
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
        queue={structureQueue}
        structureMore={structureMore}
        setStructureMore={setStructureMore}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
          if (structureMore && structureQueue.length > 1) {
            const idx = structureQueue.findIndex((e) => e.id === selectedEmployeeForStructure?.id)
            const next = structureQueue[idx + 1]
            if (next) setSelectedEmployeeForStructure(next)
            else {
              setSalaryStructureDialogOpen(false)
              setSelectedEmployeeForStructure(null)
            }
          } else {
            setSalaryStructureDialogOpen(false)
            setSelectedEmployeeForStructure(null)
          }
        }}
        onSkip={() => {
          const idx = structureQueue.findIndex((e) => e.id === selectedEmployeeForStructure?.id)
          const next = structureQueue[idx + 1]
          if (next) setSelectedEmployeeForStructure(next)
          else {
            setSalaryStructureDialogOpen(false)
            setSelectedEmployeeForStructure(null)
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

const defaultStructureFormData = {
  annualCtc: '',
  basicSalary: '15000',
  hraAllowance: '',
  medicalAllowance: '1500',
  conveyanceAllowance: '2150',
  otherAllowance: '0',
  insuranceDeduction: '0',
  applyPf: true,
  applyTds: false,
  tdsMonthly: '0',
  tdsRatePercent: '' as string,
  effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
}

function SalaryStructureDialog({
  open,
  onOpenChange,
  employee,
  queue,
  structureMore,
  setStructureMore,
  onSuccess,
  onSkip,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee: Employee | null
  queue: Employee[]
  structureMore: boolean
  setStructureMore: (v: boolean) => void
  onSuccess: () => void
  onSkip: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(defaultStructureFormData)
  const structureContentRef = useRef<HTMLDivElement>(null)

  const { data: existingStructures = [] } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structure', employee?.id],
    queryFn: () => apiGet<SalaryStructure[]>(`/api/finance/salary-structure?employeeId=${employee?.id}`),
    enabled: !!employee?.id && open,
  })

  useEffect(() => {
    if (open && employee?.id) {
      queryClient.invalidateQueries({ queryKey: ['salary-structure', employee.id] })
    }
  }, [open, employee?.id, queryClient])

  useEffect(() => {
    if (employee?.id) setFormData(defaultStructureFormData)
  }, [employee?.id])

  useEffect(() => {
    if (!employee?.id) return
    const scrollEl = structureContentRef.current?.parentElement
    if (scrollEl && scrollEl.scrollTop !== undefined) scrollEl.scrollTo({ top: 0, behavior: 'smooth' })
  }, [employee?.id])

  useEffect(() => {
    if (!employee?.id || existingStructures.length === 0) return
    const latest = existingStructures
      .filter((s) => s.employeeId === employee.id)
      .sort((a, b) => {
        const byEff = new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
        if (byEff !== 0) return byEff
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      })[0]
    if (latest) {
      const hra = (latest as { hraAllowance?: number }).hraAllowance ?? latest.basicSalary * 0.5
      setFormData({
        annualCtc: String(latest.annualCtc),
        basicSalary: String(latest.basicSalary),
        hraAllowance: String(hra),
        medicalAllowance: String(latest.medicalAllowance),
        conveyanceAllowance: String(latest.conveyanceAllowance),
        otherAllowance: String(latest.otherAllowance),
        insuranceDeduction: String(latest.insuranceDeduction ?? 0),
        applyPf: latest.applyPf ?? true,
        applyTds: latest.applyTds,
        tdsMonthly: String(latest.tdsMonthly ?? 0),
        tdsRatePercent: latest.tdsRatePercent != null ? String(latest.tdsRatePercent) : '',
        effectiveFrom: format(new Date(latest.effectiveFrom), 'yyyy-MM-dd'),
      })
    }
  }, [employee?.id, existingStructures])

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<SalaryStructure>('/api/finance/salary-structure', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      queryClient.invalidateQueries({ queryKey: ['salary-structure-active'] })
      queryClient.invalidateQueries({ queryKey: ['salary-structure', employee?.id] })
      onSuccess()
      toast.success('Salary structure saved')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  })

  const annualCtcNum = formData.annualCtc ? Number(formData.annualCtc) : 0
  const basicNum = Number(formData.basicSalary) || 0
  const monthlyGross = annualCtcNum
    ? (formData.applyPf ? annualCtcNum / 12 - 0.12 * basicNum : annualCtcNum / 12)
    : 0
  const hraNum = formData.hraAllowance !== '' ? Number(formData.hraAllowance) : basicNum * 0.5
  const other = Number(formData.otherAllowance) || 0
  const specialAllowance = Math.max(
    0,
    monthlyGross -
      basicNum -
      hraNum -
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
      hraAllowance: formData.hraAllowance !== '' ? Number(formData.hraAllowance) : basicSalary * 0.5,
      medicalAllowance: Number(formData.medicalAllowance) || 0,
      conveyanceAllowance: Number(formData.conveyanceAllowance) || 0,
      otherAllowance: other,
      insuranceDeduction: Number(formData.insuranceDeduction) || 0,
      applyPf: formData.applyPf,
      applyTds: formData.applyTds,
      tdsMonthly: Number(formData.tdsMonthly) || 0,
      tdsRatePercent: formData.tdsRatePercent ? Number(formData.tdsRatePercent) : null,
      effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
    })
  }

  if (!employee) return null

  const currentStructureIndex = queue.findIndex((e) => e.id === employee.id) + 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div ref={structureContentRef}>
        <DialogHeader>
          <DialogTitle>Salary Structure — {employee.user.name}</DialogTitle>
        </DialogHeader>

        {structureMore && queue.length > 1 && (
          <div className="space-y-2 rounded-lg border p-4 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Employee {currentStructureIndex} of {queue.length}</span>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground">Structure more</Label>
                <Switch checked={structureMore} onCheckedChange={setStructureMore} />
              </div>
            </div>
            <Progress value={(currentStructureIndex / queue.length) * 100} className="h-2" />
          </div>
        )}

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
                onChange={(e) => {
                  const v = e.target.value
                  setFormData((prev) => {
                    const next = { ...prev, basicSalary: v }
                    if (prev.hraAllowance === '' || prev.hraAllowance === String((Number(prev.basicSalary) || 0) * 0.5)) {
                      next.hraAllowance = String(Math.round((Number(v) || 0) * 0.5))
                    }
                    return next
                  })
                }}
                min={15000}
                step={100}
              />
            </div>
            <div>
              <Label>HRA (₹) — 50% of basic, editable</Label>
              <Input
                type="number"
                value={formData.hraAllowance === '' ? Math.round(basicNum * 0.5) : formData.hraAllowance}
                onChange={(e) => setFormData({ ...formData, hraAllowance: e.target.value })}
                onFocus={() => {
                  if (formData.hraAllowance === '') {
                    setFormData((f) => ({ ...f, hraAllowance: String(Math.round(basicNum * 0.5)) }))
                  }
                }}
                min={0}
                placeholder={`${Math.round(basicNum * 0.5)} (50% of basic)`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Medical Allowance (₹)</Label>
              <Input
                type="number"
                value={formData.medicalAllowance}
                onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })}
                min={0}
              />
            </div>
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
            <Label>Miscellaneous Deduction (₹)</Label>
            <Input
              type="number"
              value={formData.insuranceDeduction}
              onChange={(e) => setFormData({ ...formData, insuranceDeduction: e.target.value })}
              min={0}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>PF applicable</Label>
              <p className="text-xs text-muted-foreground">When on, 12% of basic is deducted from gross; EPF is calculated in payroll.</p>
            </div>
            <Switch
              checked={formData.applyPf}
              onCheckedChange={(v) => setFormData({ ...formData, applyPf: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Apply TDS for this employee</Label>
              <p className="text-xs text-muted-foreground">When on, TDS amount or rate is used in payroll.</p>
            </div>
            <Switch
              checked={formData.applyTds}
              onCheckedChange={(v) => setFormData({ ...formData, applyTds: v })}
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
          {(!structureMore || queue.length <= 1) && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Structure more</Label>
                <p className="text-xs text-muted-foreground">After save, load next employee in queue.</p>
              </div>
              <Switch checked={structureMore} onCheckedChange={setStructureMore} />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {structureMore && queue.length > 1 && (
              <Button type="button" variant="outline" onClick={onSkip}>
                Skip to next
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Structure'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

