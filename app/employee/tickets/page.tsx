'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { Ticket, Plus, Clock, CheckCircle, AlertCircle, Building } from 'lucide-react'
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
  department: {
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

export default function EmployeeTicketsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['my-tickets'],
    queryFn: () => apiGet<SupportTicket[]>('/api/employee/tickets'),
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      departmentId: string
      subject: string
      description: string
      priority: string
    }) => apiPost<SupportTicket>('/api/employee/tickets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      setIsDialogOpen(false)
      toast.success('Ticket raised successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create ticket')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground mt-1">Raise tickets for assistance - Response within 48 hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Raise Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and select the relevant department
              </DialogDescription>
            </DialogHeader>
            <CreateTicketForm
              departments={departments || []}
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            My Tickets
          </CardTitle>
          <CardDescription>Track the status of your support requests</CardDescription>
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
                  <div key={ticket.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Building className="h-3 w-3" />
                          {ticket.department.name}
                          <span>•</span>
                          {format(new Date(ticket.createdAt), 'PPP')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityConfig.variant}>
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm bg-muted/50 p-3 rounded mb-3">{ticket.description}</p>

                    {ticket.response && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-700">Response:</p>
                        <p className="text-sm text-green-600">{ticket.response}</p>
                        {ticket.respondedAt && (
                          <p className="text-xs text-green-500 mt-2">
                            Responded on {format(new Date(ticket.respondedAt), 'PPP')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tickets raised yet</p>
              <p className="text-sm mt-1">Click &quot;Raise Ticket&quot; to get help</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CreateTicketForm({
  departments,
  onSubmit,
  isLoading,
}: {
  departments: Department[]
  onSubmit: (data: { departmentId: string; subject: string; description: string; priority: string }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    departmentId: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Department *</Label>
        <Select
          value={formData.departmentId}
          onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Subject *</Label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Brief description of your issue"
          required
          minLength={5}
        />
      </div>

      <div>
        <Label>Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => setFormData({ ...formData, priority: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Provide detailed information about your issue..."
          rows={4}
          required
          minLength={20}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Ticket'}
        </Button>
      </div>
    </form>
  )
}

