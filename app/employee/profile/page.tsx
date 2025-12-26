'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { User, Mail, Hash, Calendar, DollarSign, Building, Cake } from 'lucide-react'
import { format } from 'date-fns'
import { BirthdayCard } from '@/components/birthday-card'

interface Employee {
  id: string
  employeeCode: string
  joinDate: Date | null
  salary: number | null
  dateOfBirth: Date | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  department: {
    id: string
    name: string
    description: string | null
  } | null
}

export default function EmployeeProfilePage() {
  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ['employee', 'my'],
    queryFn: () => apiGet<Employee>('/api/employees/my'),
  })

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Birthday Wish Card */}
      <BirthdayCard />

      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">View your employee details</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      ) : employee ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{employee.user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{employee.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{employee.employeeCode}</p>
                </div>
              </div>
              {employee.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Cake className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {format(new Date(employee.dateOfBirth), 'PPP')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Your employment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-medium">
                    {employee.joinDate
                      ? format(new Date(employee.joinDate), 'PPP')
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Salary</p>
                  <p className="font-medium">{formatCurrency(employee.salary)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{employee.user.role.replace('_', ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Employee record not found</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

