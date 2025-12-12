'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { useState } from 'react'
import { Plus, Edit, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface LeaveType {
  id: string
  name: string
  maxDays: number
  isActive: boolean
}

export default function HRLeaveTypesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null)
  const queryClient = useQueryClient()

  const { data: leaveTypes, isLoading } = useQuery<LeaveType[]>({
    queryKey: ['leaveTypes', 'all'],
    queryFn: () => apiGet<LeaveType[]>('/api/leaves/types'),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; maxDays: number; isActive?: boolean }) =>
      apiPost<LeaveType>('/api/leaves/types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] })
      setIsDialogOpen(false)
      toast.success('Leave type created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create leave type')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; maxDays?: number; isActive?: boolean } }) =>
      apiPatch<LeaveType>(`/api/leaves/types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] })
      setIsDialogOpen(false)
      setEditingLeaveType(null)
      toast.success('Leave type updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update leave type')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/leaves/types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] })
      toast.success('Leave type deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete leave type')
    },
  })

  const handleEdit = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this leave type? This action cannot be undone if there are existing leave requests or balances.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage leave types</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingLeaveType(null)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLeaveType ? 'Edit Leave Type' : 'Create Leave Type'}
              </DialogTitle>
              <DialogDescription>
                {editingLeaveType ? 'Update leave type details' : 'Add a new leave type'}
              </DialogDescription>
            </DialogHeader>
            <LeaveTypeForm
              leaveType={editingLeaveType}
              onSubmit={(data) => {
                if (editingLeaveType) {
                  updateMutation.mutate({ id: editingLeaveType.id, data })
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
          <CardTitle>Leave Types</CardTitle>
          <CardDescription>Manage all leave types</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Max Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes?.map((leaveType) => (
                  <TableRow key={leaveType.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {leaveType.name}
                      </div>
                    </TableCell>
                    <TableCell>{leaveType.maxDays} days</TableCell>
                    <TableCell>
                      {leaveType.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(leaveType)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(leaveType.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!leaveTypes || leaveTypes.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No leave types found
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

function LeaveTypeForm({
  leaveType,
  onSubmit,
  isLoading,
}: {
  leaveType: LeaveType | null
  onSubmit: (data: { name: string; maxDays: number; isActive?: boolean }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: leaveType?.name || '',
    maxDays: leaveType?.maxDays || 0,
    isActive: leaveType?.isActive ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: formData.name,
      maxDays: formData.maxDays,
      isActive: formData.isActive,
    })
    if (!leaveType) {
      setFormData({ name: '', maxDays: 0, isActive: true })
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
          placeholder="e.g., Casual, Paid, Sick"
        />
      </div>
      <div>
        <Label>Max Days</Label>
        <Input
          type="number"
          value={formData.maxDays}
          onChange={(e) => setFormData({ ...formData, maxDays: parseInt(e.target.value) || 0 })}
          required
          min={1}
          placeholder="Maximum days allowed per year"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active (visible to employees)
        </Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : leaveType ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

