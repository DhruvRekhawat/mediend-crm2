'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Ticket, Clock, CheckCircle, AlertCircle, User, Building, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
}

interface SupportTicket {
  id: string
  subject: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  response: string | null
  respondedAt: string | null
  createdAt: string
  deadline: string
  hoursRemaining: number
  isOverdue: boolean
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
  department: {
    id: string
    name: string
  }
}

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', variant: 'secondary' as const },
  MEDIUM: { label: 'Medium', variant: 'default' as const },
  HIGH: { label: 'High', variant: 'destructive' as const },
  URGENT: { label: 'Urgent', variant: 'destructive' as const },
}

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'secondary' as const, icon: Clock },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' as const, icon: AlertCircle },
  RESOLVED: { label: 'Resolved', variant: 'default' as const, icon: CheckCircle },
  CLOSED: { label: 'Closed', variant: 'outline' as const, icon: CheckCircle },
}

export default function HRTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['hr-tickets', statusFilter, departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (departmentFilter !== 'all') params.append('departmentId', departmentFilter)
      const query = params.toString()
      return apiGet<SupportTicket[]>(`/api/hr/tickets${query ? '?' + query : ''}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: string; response?: string }) =>
      apiPatch<SupportTicket>(`/api/hr/tickets?id=${id}`, { status, response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-tickets'] })
      toast.success('Ticket updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const openCount = tickets?.filter((t) => t.status === 'OPEN').length || 0
  const overdueCount = tickets?.filter((t) => t.isOverdue).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage employee support requests - 48hr SLA
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${overdueCount > 0 ? 'text-red-700' : ''}`}>
              Overdue
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-700' : ''}`}>
              {overdueCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets?.filter((t) => t.status === 'IN_PROGRESS').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets?.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 mt-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status]
                const priorityConfig = PRIORITY_CONFIG[ticket.priority]
                const StatusIcon = statusConfig.icon
                return (
                  <div 
                    key={ticket.id} 
                    className={`border rounded-lg p-4 ${ticket.isOverdue ? 'border-red-300 bg-red-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.employee.user.name} ({ticket.employee.employeeCode})
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            To: {ticket.department.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'OPEN' && (
                          <Badge 
                            variant={ticket.isOverdue ? 'destructive' : 'outline'}
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {ticket.isOverdue ? 'OVERDUE' : `${ticket.hoursRemaining}h left`}
                          </Badge>
                        )}
                        <Badge variant={priorityConfig.variant}>{priorityConfig.label}</Badge>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      Created: {format(new Date(ticket.createdAt), 'PPP p')}
                    </p>

                    <p className="text-sm bg-white p-3 rounded border mb-4">{ticket.description}</p>

                    {ticket.response && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-700">Response:</p>
                        <p className="text-sm text-green-600">{ticket.response}</p>
                      </div>
                    )}

                    {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
                      <div className="flex gap-2">
                        {ticket.status === 'OPEN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({
                              id: ticket.id,
                              status: 'IN_PROGRESS',
                            })}
                            disabled={updateMutation.isPending}
                          >
                            Start Working
                          </Button>
                        )}
                        <RespondDialog
                          ticket={ticket}
                          onSubmit={(response) => updateMutation.mutate({
                            id: ticket.id,
                            status: 'RESOLVED',
                            response,
                          })}
                          isLoading={updateMutation.isPending}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tickets found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RespondDialog({
  ticket,
  onSubmit,
  isLoading,
}: {
  ticket: SupportTicket
  onSubmit: (response: string) => void
  isLoading: boolean
}) {
  const [response, setResponse] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (!response.trim()) {
      toast.error('Please provide a response')
      return
    }
    onSubmit(response)
    setOpen(false)
    setResponse('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="h-4 w-4 mr-1" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Ticket</DialogTitle>
          <DialogDescription>
            Provide a response to {ticket.employee.user.name}&apos;s ticket
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Resolution / Response *</Label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Describe how the issue was resolved..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !response.trim()}>
              {isLoading ? 'Resolving...' : 'Resolve Ticket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

