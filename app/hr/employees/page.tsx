'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Edit, Building, Hash, Calendar, DollarSign, Search, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface Department {
  id: string
  name: string
}

interface Employee {
  id: string
  employeeCode: string
  joinDate: Date | null
  salary: number | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  department: {
    id: string
    name: string
  } | null
}

export default function HREmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  
  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [joinDateFrom, setJoinDateFrom] = useState('')
  const [joinDateTo, setJoinDateTo] = useState('')

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (departmentFilter && departmentFilter !== 'all') {
        params.set('departmentId', departmentFilter)
      }
      return apiGet<Employee[]>(`/api/employees?${params.toString()}`)
    },
  })

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { employeeCode?: string; joinDate?: string | null; salary?: number | null; departmentId?: string | null } }) =>
      apiPatch<Employee>(`/api/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setIsDialogOpen(false)
      setSelectedEmployee(null)
      toast.success('Employee updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update employee')
    },
  })

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsDialogOpen(true)
  }

  // Get unique roles from employees
  const uniqueRoles = Array.from(new Set(employees?.map(e => e.user.role) || [])).sort()

  // Filter employees based on filters
  const filteredEmployees = employees?.filter((employee) => {
    // Department filter
    if (departmentFilter !== 'all' && employee.department?.id !== departmentFilter) {
      return false
    }

    // Role filter
    if (roleFilter !== 'all' && employee.user.role !== roleFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = employee.user.name.toLowerCase().includes(query)
      const matchesEmail = employee.user.email.toLowerCase().includes(query)
      const matchesCode = employee.employeeCode.toLowerCase().includes(query)
      if (!matchesName && !matchesEmail && !matchesCode) {
        return false
      }
    }

    // Date range filter
    if (joinDateFrom && employee.joinDate) {
      const joinDate = new Date(employee.joinDate)
      const fromDate = new Date(joinDateFrom)
      if (joinDate < fromDate) {
        return false
      }
    }
    if (joinDateTo && employee.joinDate) {
      const joinDate = new Date(employee.joinDate)
      const toDate = new Date(joinDateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      if (joinDate > toDate) {
        return false
      }
    }

    return true
  }) || []

  const hasActiveFilters = departmentFilter !== 'all' || roleFilter !== 'all' || searchQuery || joinDateFrom || joinDateTo

  const clearFilters = () => {
    setDepartmentFilter('all')
    setRoleFilter('all')
    setSearchQuery('')
    setJoinDateFrom('')
    setJoinDateTo('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-muted-foreground mt-1">Manage employee details and information</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle>Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Join Date From</Label>
              <Input
                type="date"
                value={joinDateFrom}
                onChange={(e) => setJoinDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Join Date To</Label>
              <Input
                type="date"
                value={joinDateTo}
                onChange={(e) => setJoinDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>View and edit employee details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.user.name}</TableCell>
                    <TableCell>{employee.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{employee.user.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {employee.employeeCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.department ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {employee.department.name}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.joinDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(employee.joinDate), 'PPP')}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.salary ? (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                          }).format(employee.salary)}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {hasActiveFilters ? 'No employees match the filters' : 'No employees found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) setSelectedEmployee(null)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeEditForm
              employee={selectedEmployee}
              departments={departments || []}
              onSubmit={(data) => {
                const updateData: { employeeCode?: string; joinDate?: string | null; salary?: number | null; departmentId?: string | null } = {}
                if (data.employeeCode) updateData.employeeCode = data.employeeCode
                if (data.joinDate !== undefined) updateData.joinDate = data.joinDate
                if (data.salary !== undefined) updateData.salary = data.salary
                if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
                updateMutation.mutate({ id: selectedEmployee.id, data: updateData })
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmployeeEditForm({
  employee,
  departments,
  onSubmit,
  isLoading,
}: {
  employee: Employee
  departments: Department[]
  onSubmit: (data: {
    employeeCode?: string
    joinDate?: string | null
    salary?: number | null
    departmentId?: string | null
  }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    employeeCode: employee.employeeCode,
    joinDate: employee.joinDate ? format(new Date(employee.joinDate), 'yyyy-MM-dd') : '',
    salary: employee.salary?.toString() || '',
    departmentId: employee.department?.id || 'none',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      employeeCode: formData.employeeCode,
      joinDate: formData.joinDate ? formData.joinDate : null,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      departmentId: formData.departmentId === 'none' ? null : formData.departmentId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Employee Code</Label>
        <Input
          value={formData.employeeCode}
          onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Join Date</Label>
        <Input
          type="date"
          value={formData.joinDate}
          onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
        />
      </div>

      <div>
        <Label>Salary</Label>
        <Input
          type="number"
          value={formData.salary}
          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          min={0}
          step="0.01"
        />
      </div>

      <div>
        <Label>Department</Label>
        <Select
          value={formData.departmentId}
          onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Employee'}
        </Button>
      </div>
    </form>
  )
}

