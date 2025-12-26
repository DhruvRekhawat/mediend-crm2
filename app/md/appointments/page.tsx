'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Calendar, Clock, CheckCircle, XCircle, User, Building } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Appointment {
  id: string
  preferredDate: string | null
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  remarks: string | null
  createdAt: string
  employee: {
    employeeCode: string
    user: {
      name: string
      email: string
    }
    department: {
      name: string
    } | null
  }
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
  COMPLETED: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
}

export default function MDAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['md-appointments', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return apiGet<Appointment[]>(`/api/md/appointments${params}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      apiPatch<Appointment>(`/api/md/appointments?id=${id}`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-appointments'] })
      toast.success('Appointment updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const pendingCount = appointments?.filter((a) => a.status === 'PENDING').length || 0

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointment Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage employee appointment requests
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = appointments?.filter((a) => a.status === key).length || 0
            const Icon = config.icon
            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <span>Filter by status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment) => {
                  const statusConfig = STATUS_CONFIG[appointment.status]
                  const StatusIcon = statusConfig.icon
                  return (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{appointment.employee.user.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ({appointment.employee.employeeCode})
                            </span>
                          </div>
                          {appointment.employee.department && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building className="h-3 w-3" />
                              {appointment.employee.department.name}
                            </div>
                          )}
                        </div>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Requested:</span>{' '}
                          {format(new Date(appointment.createdAt), 'PPP')}
                        </div>
                        {appointment.preferredDate && (
                          <div>
                            <span className="text-muted-foreground">Preferred:</span>{' '}
                            {format(new Date(appointment.preferredDate), 'PPP p')}
                          </div>
                        )}
                      </div>

                      <p className="text-sm font-medium mb-1">Reason:</p>
                      <p className="text-sm bg-muted/50 p-3 rounded mb-4">{appointment.reason}</p>

                      {appointment.remarks && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm font-medium text-blue-700">Your Remarks:</p>
                          <p className="text-sm text-blue-600">{appointment.remarks}</p>
                        </div>
                      )}

                      {appointment.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <AppointmentActionDialog
                            appointment={appointment}
                            action="approve"
                            onSubmit={(remarks) => updateMutation.mutate({
                              id: appointment.id,
                              status: 'APPROVED',
                              remarks,
                            })}
                            isLoading={updateMutation.isPending}
                          />
                          <AppointmentActionDialog
                            appointment={appointment}
                            action="reject"
                            onSubmit={(remarks) => updateMutation.mutate({
                              id: appointment.id,
                              status: 'REJECTED',
                              remarks,
                            })}
                            isLoading={updateMutation.isPending}
                          />
                        </div>
                      )}

                      {appointment.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({
                            id: appointment.id,
                            status: 'COMPLETED',
                          })}
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No appointment requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}

function AppointmentActionDialog({
  appointment,
  action,
  onSubmit,
  isLoading,
}: {
  appointment: Appointment
  action: 'approve' | 'reject'
  onSubmit: (remarks?: string) => void
  isLoading: boolean
}) {
  const [remarks, setRemarks] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    onSubmit(remarks || undefined)
    setOpen(false)
    setRemarks('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={action === 'approve' ? 'default' : 'destructive'}
        >
          {action === 'approve' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} Appointment
          </DialogTitle>
          <DialogDescription>
            {action === 'approve'
              ? 'Approve this appointment request from ' + appointment.employee.user.name
              : 'Reject this appointment request from ' + appointment.employee.user.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Remarks (Optional)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks for the employee..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={action === 'approve' ? 'default' : 'destructive'}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

