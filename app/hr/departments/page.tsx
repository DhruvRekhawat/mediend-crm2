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
import { useState } from 'react'
import { Plus, Edit, Trash2, Building, User, Network, UserPlus, Users, UserCog } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

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

export default function HRDepartmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const queryClient = useQueryClient()

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  // Fetch department head users
  const { data: deptHeadUsers } = useQuery<DepartmentHeadUser[]>({
    queryKey: ['dept-head-users'],
    queryFn: async () => {
      const users = await apiGet<any[]>('/api/users')
      // Filter for department head roles
      return users.filter((u: any) => 
        ['INSURANCE_HEAD', 'PL_HEAD', 'SALES_HEAD', 'HR_HEAD', 'FINANCE_HEAD'].includes(u.role)
      )
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
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string | null } }) =>
      apiPatch<Department>(`/api/departments/${id}`, data),
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
          <p className="text-muted-foreground mt-1">Create and manage departments</p>
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
                  updateMutation.mutate({ id: editingDept.id, data })
                } else {
                  createMutation.mutate(data)
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage all departments</CardDescription>
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
                  <TableHead>Head</TableHead>
                  <TableHead>Headcount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {dept.name}
                      </div>
                    </TableCell>
                    <TableCell>{dept.description || 'N/A'}</TableCell>
                    <TableCell>
                      {dept.head ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{dept.head.name}</span>
                          <span className="text-xs text-muted-foreground">({dept.head.role.replace('_', ' ')})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No head assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{dept.headcount ?? dept._count.employees}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/hr/departments/${dept.id}`}>
                          <Button variant="outline" size="sm">
                            <Network className="h-4 w-4 mr-1" />
                            View Hierarchy
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dept)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(dept.id)}
                          disabled={(dept.headcount ?? dept._count.employees) > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!departments || departments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No departments found
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

function DepartmentForm({
  department,
  deptHeadUsers,
  onSubmit,
  isLoading,
}: {
  department: Department | null
  deptHeadUsers: DepartmentHeadUser[]
  onSubmit: (data: { name: string; description?: string; headId?: string; newHead?: any }) => void
  isLoading: boolean
}) {
  const { user: currentUser } = useAuth()
  const isHRHead = currentUser?.role === 'HR_HEAD'
  const canCreateHead = isHRHead || currentUser?.role === 'MD' || currentUser?.role === 'ADMIN'

  const [headSelectionMode, setHeadSelectionMode] = useState<'existing' | 'new'>('existing')
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    headId: department?.head?.id || '',
    // New head creation fields
    newHeadName: '',
    newHeadEmail: '',
    newHeadPassword: '',
    newHeadRole: 'INSURANCE_HEAD' as 'INSURANCE_HEAD' | 'PL_HEAD' | 'SALES_HEAD' | 'HR_HEAD' | 'FINANCE_HEAD',
  })

  // Get users who are not already heads of other departments
  const { data: allDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const availableHeads = deptHeadUsers.filter((user) => {
    // If editing, allow current head
    if (department?.head?.id === user.id) {
      return true
    }
    // Otherwise, only show users who are not already heads
    return !allDepartments?.some((dept) => dept.head?.id === user.id && dept.id !== department?.id)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData: { name: string; description?: string; headId?: string; newHead?: any } = {
      name: formData.name,
      description: formData.description || undefined,
    }
    
    // Only include headId or newHead when creating (not editing)
    if (!department) {
      if (headSelectionMode === 'new' && canCreateHead) {
        // Validate new head fields
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
    
    onSubmit(submitData)
    if (!department) {
      setFormData({ 
        name: '', 
        description: '', 
        headId: '',
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
              <Tabs value={headSelectionMode} onValueChange={(value) => setHeadSelectionMode(value as 'existing' | 'new')} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Select Existing</TabsTrigger>
                  <TabsTrigger value="new">Create New</TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="mt-4">
                  <Select
                    value={formData.headId}
                    onValueChange={(value) => setFormData({ ...formData, headId: value })}
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
                            {user.name} ({user.role.replace('_', ' ')})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a user with a department head role (Insurance Head, PL Head, Sales Head, HR Head, Finance Head)
                  </p>
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
                          onValueChange={(value) => setFormData({ ...formData, newHeadRole: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INSURANCE_HEAD">Insurance Head</SelectItem>
                            <SelectItem value="PL_HEAD">P/L Head</SelectItem>
                            <SelectItem value="SALES_HEAD">Sales Head</SelectItem>
                            <SelectItem value="HR_HEAD">HR Head</SelectItem>
                            <SelectItem value="FINANCE_HEAD">Finance Head</SelectItem>
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
                  onValueChange={(value) => setFormData({ ...formData, headId: value })}
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
                          {user.name} ({user.role.replace('_', ' ')})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a user with a department head role (Insurance Head, PL Head, Sales Head, HR Head, Finance Head)
                </p>
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
            <span className="text-xs text-muted-foreground">({department.head.role.replace('_', ' ')})</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Department head cannot be changed after creation. Contact MD/Admin to reassign.
          </p>
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

  const { data: allEmployees } = useQuery<any[]>({
    queryKey: ['all-employees'],
    queryFn: () => apiGet<any[]>('/api/employees'),
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

  // Get employees not in this department
  const availableEmployees = allEmployees?.filter((emp) => {
    return emp.department?.id !== department.id
  }) || []

  // Get current employees in this department
  const currentEmployees = allEmployees?.filter((emp) => {
    return emp.department?.id === department.id
  }) || []

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
          <DialogDescription>
            Select employees to assign to this department
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {currentEmployees.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Current Employees ({currentEmployees.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {currentEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <span>{emp.user.name} ({emp.user.email})</span>
                    <Badge variant="secondary">{emp.user.role.replace('_', ' ')}</Badge>
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
                      <Badge variant="outline">{emp.user.role.replace('_', ' ')}</Badge>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
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

  const { data: allDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
    enabled: isOpen,
  })

  const assignMutation = useMutation({
    mutationFn: (headId: string | null) =>
      apiPatch(`/api/departments/${department.id}`, { headId }),
    onSuccess: () => {
      toast.success('Department head assigned successfully')
      setIsOpen(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign department head')
    },
  })

  // Get users who are not already heads of other departments (or are current head)
  const availableHeads = deptHeadUsers.filter((user) => {
    if (department.head?.id === user.id) {
      return true // Allow current head
    }
    return !allDepartments?.some((dept) => dept.head?.id === user.id && dept.id !== department.id)
  })

  if (!canAssignHead) {
    return null
  }

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
          <DialogDescription>
            Select a department head for {department.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Department Head</Label>
            <Select
              value={selectedHeadId || 'none'}
              onValueChange={(value) => setSelectedHeadId(value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department head" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Head (Remove)</SelectItem>
                {availableHeads.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role.replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {department.head && (
              <p className="text-xs text-muted-foreground mt-1">
                Current head: {department.head.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
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

