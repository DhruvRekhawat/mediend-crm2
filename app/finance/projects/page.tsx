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

interface Project {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface ProjectsResponse {
  data: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const queryClient = useQueryClient()

  const { data: projectsData, isLoading } = useQuery<ProjectsResponse>({
    queryKey: ['projects', search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('isActive', 'true')
      return apiGet<ProjectsResponse>(`/api/finance/projects?${params.toString()}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiPost('/api/finance/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Project created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> & { isActive?: boolean } }) =>
      apiPatch(`/api/finance/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDialogOpen(false)
      setEditingProject(null)
      resetForm()
      toast.success('Project updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    })
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleActive = (project: Project) => {
    updateMutation.mutate({ id: project.id, data: { isActive: !project.isActive } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Master</h1>
          <p className="text-muted-foreground mt-1">Manage projects for sales/revenue categorization</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingProject(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update project details' : 'Create a new project for sales categorization'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Project Alpha, Client XYZ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of this project"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingProject(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingProject ? 'Update' : 'Create'}
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
          <CardTitle>Projects</CardTitle>
          <CardDescription>Total: {projectsData?.pagination.total || 0} projects</CardDescription>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsData?.data.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {project.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.isActive ? 'default' : 'secondary'}>
                        {project.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(project)}
                        >
                          {project.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!projectsData?.data || projectsData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No projects found
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
