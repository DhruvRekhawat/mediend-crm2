'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Plus, Users, UserPlus, Edit, Hash, Calendar, DollarSign, Building } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type UserRole = 'MD' | 'SALES_HEAD' | 'TEAM_LEAD' | 'BD' | 'INSURANCE_HEAD' | 'PL_HEAD' | 'HR_HEAD' | 'ADMIN'

interface Team {
  id: string
  name: string
  circle: 'North' | 'South' | 'East' | 'West' | 'Central'
  salesHeadId: string
  salesHead?: {
    id: string
    name: string
    email: string
  }
  members?: Array<{
    id: string
    name: string
    email: string
    role: UserRole
  }>
}

interface Employee {
  id: string
  employeeCode: string
  joinDate: Date | null
  salary: number | null
  departmentId: string | null
  department?: {
    id: string
    name: string
  } | null
}

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  teamId: string | null
  team?: {
    id: string
    name: string
    circle: 'North' | 'South' | 'East' | 'West' | 'Central'
  }
  employee?: Employee | null
}

interface CreateUserData {
  name: string
  email: string
  password: string
  role: UserRole
  teamId: string | null
}

export default function HRUsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiGet<User[]>('/api/users'),
  })

  const { data: departments } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Array<{ id: string; name: string }>>('/api/departments'),
  })

  const { data: teams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => apiGet<Team[]>('/api/teams'),
  })

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserData) => apiPost<User>('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDialogOpen(false)
      toast.success('User created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-1">Manage users, roles, and team assignments</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>
                <CreateUserForm
                  teams={teams || []}
                  onSubmit={(data) => createUserMutation.mutate(data)}
                  isLoading={createUserMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BDs</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter((u) => u.role === 'BD').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter((u) => u.role === 'TEAM_LEAD').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
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
                        <TableHead>Team</TableHead>
                        <TableHead>Employee Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{user.team?.name || 'No Team'}</TableCell>
                        <TableCell>
                          {user.employee ? (
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              {user.employee.employeeCode}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.employee?.department ? (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              {user.employee.department.name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.employee?.salary ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                minimumFractionDigits: 0,
                              }).format(user.employee.salary)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <EditEmployeeDialog
                            user={user}
                            departments={departments || []}
                            onSuccess={() => {
                              queryClient.invalidateQueries({ queryKey: ['users'] })
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!users || users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  )
}

function CreateUserForm({
  teams,
  onSubmit,
  isLoading,
}: {
  teams: Team[]
  onSubmit: (data: CreateUserData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BD' as UserRole,
    teamId: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      teamId: formData.teamId || null,
    })
    // Reset form
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'BD',
      teamId: '',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label>Password</Label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BD">BD</SelectItem>
              <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
              <SelectItem value="SALES_HEAD">Sales Head</SelectItem>
              <SelectItem value="INSURANCE_HEAD">Insurance Head</SelectItem>
              <SelectItem value="PL_HEAD">P/L Head</SelectItem>
              <SelectItem value="HR_HEAD">HR Head</SelectItem>
              <SelectItem value="MD">MD</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(formData.role === 'BD' || formData.role === 'TEAM_LEAD') && (
          <div>
            <Label>Team</Label>
            <Select
              value={formData.teamId}
              onValueChange={(value) => setFormData({ ...formData, teamId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

function EditEmployeeDialog({
  user,
  departments,
  onSuccess,
}: {
  user: User
  departments: Array<{ id: string; name: string }>
  onSuccess: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    employeeCode: user.employee?.employeeCode || '',
    joinDate: user.employee?.joinDate ? format(new Date(user.employee.joinDate), 'yyyy-MM-dd') : '',
    salary: user.employee?.salary?.toString() || '',
    departmentId: user.employee?.departmentId || 'none',
  })

  const createEmployeeMutation = useMutation({
    mutationFn: (data: {
      userId: string
      employeeCode: string
      joinDate?: string | null
      salary?: number | null
      departmentId?: string | null
    }) => apiPost('/api/employees', data),
    onSuccess: () => {
      toast.success('Employee record created successfully')
      setIsOpen(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create employee record')
    },
  })

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: {
      employeeCode?: string
      joinDate?: string | null
      salary?: number | null
      departmentId?: string | null
    }) => {
      if (user.employee) {
        // Update existing employee
        return apiPatch(`/api/employees/${user.employee.id}`, data)
      } else {
        throw new Error('Employee record not found')
      }
    },
    onSuccess: () => {
      toast.success('Employee details updated successfully')
      setIsOpen(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update employee details')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (user.employee) {
      // Update existing employee
      const updateData: { employeeCode?: string; joinDate?: string | null; salary?: number | null; departmentId?: string | null } = {}
      if (formData.employeeCode) updateData.employeeCode = formData.employeeCode
      if (formData.joinDate) updateData.joinDate = formData.joinDate
      if (formData.salary) updateData.salary = parseFloat(formData.salary)
      if (formData.departmentId !== undefined) updateData.departmentId = formData.departmentId === 'none' ? null : formData.departmentId || null
      updateEmployeeMutation.mutate(updateData)
    } else {
      // Create new employee
      if (!formData.employeeCode) {
        toast.error('Employee code is required')
        return
      }
      createEmployeeMutation.mutate({
        userId: user.id,
        employeeCode: formData.employeeCode,
        joinDate: formData.joinDate || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        departmentId: formData.departmentId === 'none' ? null : formData.departmentId || null,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          {user.employee ? 'Edit Employee' : 'Add Employee'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Employee Details</DialogTitle>
          <DialogDescription>
            Manage employee information for {user.name}
          </DialogDescription>
        </DialogHeader>
        {!user.employee && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-800">
              No employee record found. Fill in the details below to create one.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Employee Code *</Label>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEmployeeMutation.isPending || createEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending || createEmployeeMutation.isPending
                ? (user.employee ? 'Updating...' : 'Creating...')
                : (user.employee ? 'Update Employee' : 'Create Employee')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

