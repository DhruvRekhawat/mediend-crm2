'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { User, Mail, Hash, Calendar, DollarSign, Building, Cake, Edit, Shield, Key } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { BirthdayCard } from '@/components/birthday-card'

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  teamId: string | null
}

interface Employee {
  id: string
  employeeCode: string
  joinDate: Date | null
  salary: number | null
  dateOfBirth: Date | null
  department: {
    id: string
    name: string
    description: string | null
  } | null
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)

  const { data: user, isLoading: isLoadingUser } = useQuery<SessionUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<SessionUser>('/api/auth/me'),
  })

  const { data: employee, isLoading: isLoadingEmployee } = useQuery<Employee>({
    queryKey: ['employee', 'my'],
    queryFn: () => apiGet<Employee>('/api/employees/my'),
    enabled: !!user, // Only fetch if user exists
    retry: false, // Don't retry if employee doesn't exist
  })

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">User not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Birthday Wish Card */}
      {employee && <BirthdayCard />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and manage your profile information</p>
        </div>
        <div className="flex gap-2">
          <ChangePasswordDialog
            userId={user.id}
            isOpen={isChangePasswordDialogOpen}
            onOpenChange={setIsChangePasswordDialogOpen}
          />
          <EditUserDialog
            user={user}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="secondary" className="mt-1">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Details Card */}
        {isLoadingEmployee ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading employee details...</div>
            </CardContent>
          </Card>
        ) : employee ? (
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Your employment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{employee.employeeCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-medium">
                    {employee.joinDate ? format(new Date(employee.joinDate), 'PPP') : 'N/A'}
                  </p>
                </div>
              </div>
              {employee.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Cake className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {format(new Date(employee.dateOfBirth), 'PPP')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Salary</p>
                  <p className="font-medium">{formatCurrency(employee.salary)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Your employment information</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>Employee record not found</p>
                <p className="text-sm mt-2">Contact HR to set up your employee profile</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function EditUserDialog({
  user,
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  user: SessionUser
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  // Initialize form data based on user prop
  const getInitialFormData = () => ({
    name: user.name,
    email: user.email,
  })
  const [formData, setFormData] = useState(getInitialFormData)

  const updateUserMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      apiPatch<SessionUser>(`/api/users/${user.id}`, data),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      onOpenChange(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile')
    },
  })

  // Reset form when dialog opens using callback approach
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (open) {
      setFormData(getInitialFormData())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUserMutation.mutate(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your name and email address</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Your name"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
              required
              placeholder="your@email.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordDialog({
  userId,
  isOpen,
  onOpenChange,
}: {
  userId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const getInitialFormData = () => ({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [formData, setFormData] = useState(getInitialFormData)

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiPatch(`/api/users/${userId}/password`, data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      onOpenChange(false)
      setFormData(getInitialFormData())
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change password')
    },
  })

  // Reset form when dialog opens using key prop approach
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (open) {
      setFormData(getInitialFormData())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long')
      return
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Key className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Update your account password</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              minLength={6}
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={6}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

