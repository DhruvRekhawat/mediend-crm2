'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit, Trash2, Building, User, UserPlus, Users, UserCog, ChevronDown, ChevronRight, Network } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
const DEPT_HEAD_ROLES = [
  'INSURANCE_HEAD',
  'PL_HEAD',
  'SALES_HEAD',
  'HR_HEAD',
  'FINANCE_HEAD',
  'OUTSTANDING_HEAD',
  'DIGITAL_MARKETING_HEAD',
  'IT_HEAD',
] as const

const DEPT_HEAD_ROLE_LABELS: Record<string, string> = {
  INSURANCE_HEAD: 'Insurance Head',
  PL_HEAD: 'P/L Head',
  SALES_HEAD: 'Sales Head',
  HR_HEAD: 'HR Head',
  FINANCE_HEAD: 'Finance Head',
  OUTSTANDING_HEAD: 'Outstanding Head',
  DIGITAL_MARKETING_HEAD: 'Digital Marketing Head',
  IT_HEAD: 'IT Head',
}

interface Department {
  id: string
  name: string
  description: string | null
  head?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  shiftStartHour?: number
  shiftStartMinute?: number
  grace1Minutes?: number
  grace2Minutes?: number
  penaltyMinutes?: number
  penaltyAmount?: number
  _count: {
    employees: number
  }
  headcount?: number
}

interface DepartmentHeadUser {
  id: string
  name: string
  email: string
  role: string
}

interface Employee {
  id: string
  employeeCode: string
  user: { id: string; name: string; email: string; role: string }
  department?: { id: string; name: string } | null
  manager?: { id: string; user: { id: string; name: string } } | null
}

export default function HRDepartmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: allEmployees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiGet<Employee[]>('/api/employees'),
  })

  const employeesByDept = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const emp of allEmployees || []) {
      if (emp.department?.id) {
        const list = map.get(emp.department.id) ?? []
        list.push(emp)
        map.set(emp.department.id, list)
      }
    }
    return map
  }, [allEmployees])

  const { data: deptHeadUsers } = useQuery<DepartmentHeadUser[]>({
    queryKey: ['dept-head-users'],
    queryFn: async () => {
      const users = await apiGet<any[]>('/api/users')
      return users.filter((u: any) => DEPT_HEAD_ROLES.includes(u.role))
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; headId?: string; newHead?: any }) =>
      apiPost<Department>('/api/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setIsDialogOpen(false)
      toast.success('Department created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create department')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: {
      id: string
      data: {
        name?: string
        description?: string | null
        shiftStartHour?: number
        shiftStartMinute?: number
        grace1Minutes?: number
        grace2Minutes?: number
        penaltyMinutes?: number
        penaltyAmount?: number
      }
    }) => apiPatch<Department>(`/api/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setIsDialogOpen(false)
      setEditingDept(null)
      toast.success('Department updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update department')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Department deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete department')
    },
  })

  const toggleExpanded = (id: string) => {
    setExpandedDeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-muted-foreground mt-1">Create departments, assign heads, and view people and managers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingDept(null)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? 'Edit Department' : 'Create Department'}
              </DialogTitle>
              <DialogDescription>
                {editingDept ? 'Update department details' : 'Add a new department'}
              </DialogDescription>
            </DialogHeader>
            <DepartmentForm
              department={editingDept}
              deptHeadUsers={deptHeadUsers || []}
              onSubmit={(data) => {
                if (editingDept) {
                  updateMutation.mutate({
                    id: editingDept.id,
                    data: {
                      name: data.name,
                      description: data.description,
                      shiftStartHour: data.shiftStartHour,
                      shiftStartMinute: data.shiftStartMinute,
                      grace1Minutes: data.grace1Minutes,
                      grace2Minutes: data.grace2Minutes,
                      penaltyMinutes: data.penaltyMinutes,
                      penaltyAmount: data.penaltyAmount,
                    },
                  })
                } else {
                  createMutation.mutate(data)
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading departments...</div>
      ) : (
        <div className="space-y-3">
          {departments?.map((dept) => {
            const isExpanded = expandedDeptIds.has(dept.id)
            const deptEmployees = employeesByDept.get(dept.id) ?? []
            const headcount = dept.headcount ?? dept._count.employees

            return (
              <Card key={dept.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => toggleExpanded(dept.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex items-center gap-2 min-w-0">
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                        <CardTitle className="text-lg truncate">{dept.name}</CardTitle>
                      </div>
                      {dept.head && (
                        <Badge variant="secondary" className="shrink-0">
                          <User className="h-3 w-3 mr-1" />
                          {dept.head.name} ({dept.head.role.replace(/_/g, ' ')})
                        </Badge>
                      )}
                      <Badge variant="outline" className="shrink-0">
                        <Users className="h-3 w-3 mr-1" />
                        {headcount}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/hr/departments/${dept.id}`}>
                        <Button variant="ghost" size="sm">
                          <Network className="h-4 w-4 mr-1" />
                          Hierarchy
                        </Button>
                      </Link>
                      <AssignEmployeesDialog
                        department={dept}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['departments'] })
                          queryClient.invalidateQueries({ queryKey: ['employees'] })
                        }}
                      />
                      <AssignHeadDialog
                        department={dept}
                        deptHeadUsers={deptHeadUsers || []}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['departments'] })
                          queryClient.invalidateQueries({ queryKey: ['dept-head-users'] })
                        }}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(dept)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(dept.id)}
                        disabled={headcount > 0}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    {deptEmployees.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Manager</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deptEmployees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">{emp.user.name}</TableCell>
                              <TableCell>{emp.employeeCode}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {emp.user.role.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {emp.manager?.user?.name ?? '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                        No employees in this department yet. Use &quot;Assign Employees&quot; to add people.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
          {(!departments || departments.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No departments found. Create one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function DepartmentForm({
  department,
  deptHeadUsers,
  onSubmit,
  isLoading,
}: {
  department: Department | null
  deptHeadUsers: DepartmentHeadUser[]
  onSubmit: (data: {
    name: string
    description?: string
    headId?: string
    newHead?: any
    shiftStartHour?: number
    shiftStartMinute?: number
    grace1Minutes?: number
    grace2Minutes?: number
    penaltyMinutes?: number
    penaltyAmount?: number
  }) => void
  isLoading: boolean
}) {
  const { user: currentUser } = useAuth()
  const canCreateHead = currentUser?.role === 'HR_HEAD' || currentUser?.role === 'MD' || currentUser?.role === 'ADMIN'

  const [headSelectionMode, setHeadSelectionMode] = useState<'existing' | 'new'>('existing')
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    headId: department?.head?.id || '',
    shiftStartHour: department?.shiftStartHour ?? 10,
    shiftStartMinute: department?.shiftStartMinute ?? 0,
    grace1Minutes: department?.grace1Minutes ?? 15,
    grace2Minutes: department?.grace2Minutes ?? 15,
    penaltyMinutes: department?.penaltyMinutes ?? 30,
    penaltyAmount: department?.penaltyAmount ?? 200,
    newHeadName: '',
    newHeadEmail: '',
    newHeadPassword: '',
    newHeadRole: 'INSURANCE_HEAD' as (typeof DEPT_HEAD_ROLES)[number],
  })

  const { data: allDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const availableHeads = deptHeadUsers.filter((user) => {
    if (department?.head?.id === user.id) return true
    return !allDepartments?.some((dept) => dept.head?.id === user.id && dept.id !== department?.id)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData: {
      name: string
      description?: string
      headId?: string
      newHead?: any
      shiftStartHour?: number
      shiftStartMinute?: number
      grace1Minutes?: number
      grace2Minutes?: number
      penaltyMinutes?: number
      penaltyAmount?: number
    } = {
      name: formData.name,
      description: formData.description || undefined,
    }

    if (!department) {
      if (headSelectionMode === 'new' && canCreateHead) {
        if (!formData.newHeadName || !formData.newHeadEmail || !formData.newHeadPassword) {
          toast.error('Please fill in all fields for the new department head')
          return
        }
        submitData.newHead = {
          name: formData.newHeadName,
          email: formData.newHeadEmail,
          password: formData.newHeadPassword,
          role: formData.newHeadRole,
        }
      } else if (formData.headId) {
        submitData.headId = formData.headId
      } else {
        toast.error('Please select or create a department head')
        return
      }
    }

    if (department) {
      submitData.shiftStartHour = formData.shiftStartHour
      submitData.shiftStartMinute = formData.shiftStartMinute
      submitData.grace1Minutes = formData.grace1Minutes
      submitData.grace2Minutes = formData.grace2Minutes
      submitData.penaltyMinutes = formData.penaltyMinutes
      submitData.penaltyAmount = formData.penaltyAmount
    }
    onSubmit(submitData)
    if (!department) {
      setFormData({
        name: '',
        description: '',
        headId: '',
        shiftStartHour: 10,
        shiftStartMinute: 0,
        grace1Minutes: 15,
        grace2Minutes: 15,
        penaltyMinutes: 30,
        penaltyAmount: 200,
        newHeadName: '',
        newHeadEmail: '',
        newHeadPassword: '',
        newHeadRole: 'INSURANCE_HEAD',
      })
      setHeadSelectionMode('existing')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Description (Optional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      {!department && (
        <div className="space-y-4">
          <div>
            <Label>Department Head *</Label>
            {canCreateHead ? (
              <Tabs value={headSelectionMode} onValueChange={(v) => setHeadSelectionMode(v as 'existing' | 'new')} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Select Existing</TabsTrigger>
                  <TabsTrigger value="new">Create New</TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="mt-4">
                  <Select
                    value={formData.headId}
                    onValueChange={(v) => setFormData({ ...formData, headId: v })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department head" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableHeads.length === 0 ? (
                        <SelectItem value="" disabled>No available department heads</SelectItem>
                      ) : (
                        availableHeads.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role.replace(/_/g, ' ')})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="new" className="mt-4">
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="h-4 w-4" />
                      <Label className="text-base font-semibold">Create New Department Head</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={formData.newHeadName}
                          onChange={(e) => setFormData({ ...formData, newHeadName: e.target.value })}
                          required
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={formData.newHeadEmail}
                          onChange={(e) => setFormData({ ...formData, newHeadEmail: e.target.value.toLowerCase().trim() })}
                          required
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Password *</Label>
                        <Input
                          type="password"
                          value={formData.newHeadPassword}
                          onChange={(e) => setFormData({ ...formData, newHeadPassword: e.target.value })}
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                      <div>
                        <Label>Role *</Label>
                        <Select
                          value={formData.newHeadRole}
                          onValueChange={(v) => setFormData({ ...formData, newHeadRole: v as (typeof DEPT_HEAD_ROLES)[number] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPT_HEAD_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {DEPT_HEAD_ROLE_LABELS[role] ?? role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A new user account will be created with the selected department head role
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="mt-2">
                <Select
                  value={formData.headId}
                  onValueChange={(v) => setFormData({ ...formData, headId: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department head" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHeads.length === 0 ? (
                      <SelectItem value="" disabled>No available department heads</SelectItem>
                    ) : (
                      availableHeads.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role.replace(/_/g, ' ')})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
      {department && department.head && (
        <div>
          <Label>Current Head</Label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <User className="h-4 w-4" />
            <span>{department.head.name}</span>
            <span className="text-xs text-muted-foreground">({department.head.role.replace(/_/g, ' ')})</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Use &quot;Reassign Head&quot; on the department card to change.
          </p>
        </div>
      )}
      {department && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">Attendance shift timing</h4>
          <p className="text-xs text-muted-foreground">
            Used for late/grace/penalty classification.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shift start (hour)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={formData.shiftStartHour}
                onChange={(e) => setFormData({ ...formData, shiftStartHour: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Shift start (minute)</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={formData.shiftStartMinute}
                onChange={(e) => setFormData({ ...formData, shiftStartMinute: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Grace 1 (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={formData.grace1Minutes}
                onChange={(e) => setFormData({ ...formData, grace1Minutes: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Grace 2 (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={formData.grace2Minutes}
                onChange={(e) => setFormData({ ...formData, grace2Minutes: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Penalty window (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={formData.penaltyMinutes}
                onChange={(e) => setFormData({ ...formData, penaltyMinutes: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Penalty amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={formData.penaltyAmount}
                onChange={(e) => setFormData({ ...formData, penaltyAmount: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={
            isLoading ||
            (!department &&
              ((headSelectionMode === 'existing' && !formData.headId) ||
                (headSelectionMode === 'new' && (!formData.newHeadName || !formData.newHeadEmail || !formData.newHeadPassword))))
          }
        >
          {isLoading ? 'Saving...' : department ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

function AssignEmployeesDialog({
  department,
  onSuccess,
}: {
  department: Department
  onSuccess: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  const { data: allEmployees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiGet<Employee[]>('/api/employees'),
    enabled: isOpen,
  })

  const assignMutation = useMutation({
    mutationFn: (employeeIds: string[]) =>
      apiPost(`/api/departments/${department.id}/assign-employees`, { employeeIds }),
    onSuccess: () => {
      toast.success('Employees assigned successfully')
      setIsOpen(false)
      setSelectedEmployeeIds([])
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign employees')
    },
  })

  const availableEmployees = allEmployees?.filter((emp) => emp.department?.id !== department.id) ?? []
  const currentEmployees = allEmployees?.filter((emp) => emp.department?.id === department.id) ?? []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-1" />
          Assign Employees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Employees to {department.name}</DialogTitle>
          <DialogDescription>Select employees to assign to this department</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {currentEmployees.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Current Employees ({currentEmployees.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {currentEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <span>{emp.user.name} ({emp.user.email})</span>
                    <Badge variant="secondary">{emp.user.role.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Available Employees</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
              {availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available employees</p>
              ) : (
                availableEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                    <input
                      type="checkbox"
                      id={`emp-${emp.id}`}
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeeIds([...selectedEmployeeIds, emp.id])
                        } else {
                          setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`emp-${emp.id}`} className="flex-1 flex items-center justify-between cursor-pointer text-sm">
                      <span>{emp.user.name} ({emp.user.email})</span>
                      <Badge variant="outline">{emp.user.role.replace(/_/g, ' ')}</Badge>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate(selectedEmployeeIds)}
              disabled={selectedEmployeeIds.length === 0 || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assigning...' : `Assign ${selectedEmployeeIds.length} Employee(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssignHeadDialog({
  department,
  deptHeadUsers,
  onSuccess,
}: {
  department: Department
  deptHeadUsers: DepartmentHeadUser[]
  onSuccess: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHeadId, setSelectedHeadId] = useState<string>(department.head?.id || '')
  const { user: currentUser } = useAuth()
  const canAssignHead = currentUser?.role === 'HR_HEAD' || currentUser?.role === 'MD' || currentUser?.role === 'ADMIN'

  useEffect(() => {
    if (isOpen) setSelectedHeadId(department.head?.id || '')
  }, [isOpen, department.head?.id])

  const { data: allDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
    enabled: isOpen,
  })

  const assignMutation = useMutation({
    mutationFn: (headId: string | null) => apiPatch(`/api/departments/${department.id}`, { headId }),
    onSuccess: () => {
      toast.success('Department head assigned successfully')
      setIsOpen(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign department head')
    },
  })

  const availableHeads = deptHeadUsers.filter((user) => {
    if (department.head?.id === user.id) return true
    return !allDepartments?.some((dept) => dept.head?.id === user.id && dept.id !== department.id)
  })

  if (!canAssignHead) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCog className="h-4 w-4 mr-1" />
          {department.head ? 'Reassign Head' : 'Assign Head'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department.head ? 'Reassign' : 'Assign'} Department Head</DialogTitle>
          <DialogDescription>Select a department head for {department.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Department Head</Label>
            <Select
              value={selectedHeadId || 'none'}
              onValueChange={(v) => setSelectedHeadId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department head" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Head (Remove)</SelectItem>
                {availableHeads.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role.replace(/_/g, ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {department.head && (
              <p className="text-xs text-muted-foreground mt-1">Current head: {department.head.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate(selectedHeadId || null)}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign Head'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
