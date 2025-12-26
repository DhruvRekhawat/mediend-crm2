'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { Plus, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Head {
  id: string
  name: string
  department: string | null
  description: string | null
  isActive: boolean
}

interface HeadsResponse {
  data: Head[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function HeadsPage() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHead, setEditingHead] = useState<Head | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
  })

  const queryClient = useQueryClient()

  const { data: headsData, isLoading } = useQuery<HeadsResponse>({
    queryKey: ['heads', search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('isActive', 'true')
      return apiGet<HeadsResponse>(`/api/finance/heads?${params.toString()}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiPost('/api/finance/heads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heads'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Head created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create head')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> & { isActive?: boolean } }) =>
      apiPatch(`/api/finance/heads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heads'] })
      setIsDialogOpen(false)
      setEditingHead(null)
      resetForm()
      toast.success('Head updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update head')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      description: '',
    })
  }

  const handleEdit = (head: Head) => {
    setEditingHead(head)
    setFormData({
      name: head.name,
      department: head.department || '',
      description: head.description || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingHead) {
      updateMutation.mutate({ id: editingHead.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleActive = (head: Head) => {
    updateMutation.mutate({ id: head.id, data: { isActive: !head.isActive } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Head Master</h1>
          <p className="text-muted-foreground mt-1">Manage transaction categories/heads</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingHead(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Head
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingHead ? 'Edit Head' : 'Add New Head'}</DialogTitle>
              <DialogDescription>
                {editingHead ? 'Update head details' : 'Create a new transaction category'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Head Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sales, IT Project, Operations"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Optional department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of this head"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingHead(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingHead ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heads</CardTitle>
          <CardDescription>Total: {headsData?.pagination.total || 0} heads</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headsData?.data.map((head) => (
                  <TableRow key={head.id}>
                    <TableCell className="font-medium">{head.name}</TableCell>
                    <TableCell>{head.department || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {head.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={head.isActive ? 'default' : 'secondary'}>
                        {head.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(head)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(head)}
                        >
                          {head.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!headsData?.data || headsData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No heads found
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

