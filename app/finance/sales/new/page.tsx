'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
interface Project {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function NewSalesEntryPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showProjectCreateDialog, setShowProjectCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [formData, setFormData] = useState({
    projectId: '',
    description: '',
    amount: '',
    notes: '',
  })

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects-active'],
    queryFn: () => apiGet<{ data: Project[] }>('/api/finance/projects?isActive=true&limit=100'),
  })

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }): Promise<Project> => {
      return apiPost<Project>('/api/finance/projects', data)
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ['projects-active'] })
      setFormData({ ...formData, projectId: data.id })
      setShowProjectCreateDialog(false)
      setNewProjectName('')
      toast.success('Project created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      transactionDate: string
      projectId: string
      description: string
      amount: number
      notes?: string
    }) => apiPost('/api/finance/sales', data),
    onSuccess: () => {
      toast.success('Sales entry created successfully!')
      router.push('/finance/sales')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create sales entry')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.projectId || !formData.description || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    createMutation.mutate({
      transactionDate: transactionDate.toISOString(),
      projectId: formData.projectId,
      description: formData.description,
      amount,
      notes: formData.notes || undefined,
    })
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Sales Entry</h1>
          <p className="text-muted-foreground mt-1">Record booked sales/revenue (does not affect bank balances)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Sales Entry Details</CardTitle>
            <CardDescription>Enter the details for this booked sale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Transaction Date *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(transactionDate, 'PPP')}
                </Button>
              </div>
              {isCalendarOpen && (
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => {
                      if (date) {
                        setTransactionDate(date)
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </div>
              )}
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Combobox<Project>
                items={projectsData?.data ?? []}
                value={projectsData?.data?.find((p) => p.id === formData.projectId) ?? null}
                onValueChange={(p) => setFormData({ ...formData, projectId: p?.id ?? '' })}
                itemToStringLabel={(p) => p.name}
                isItemEqualToValue={(a, b) => a?.id === b?.id}
                inputValue={projectSearch}
                onInputValueChange={setProjectSearch}
              >
                <ComboboxInput
                  id="project"
                  placeholder="Select project"
                  showClear
                  className="w-full"
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {projectSearch ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setNewProjectName(projectSearch)
                          setShowProjectCreateDialog(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create new project: {projectSearch}
                      </Button>
                    ) : (
                      'No projects found.'
                    )}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(project: Project) => (
                      <ComboboxItem key={project.id} value={project}>
                        {project.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <Dialog open={showProjectCreateDialog} onOpenChange={setShowProjectCreateDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Add a new project to the system</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newProjectName">Project Name *</Label>
                      <Input
                        id="newProjectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowProjectCreateDialog(false)
                          setNewProjectName('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (!newProjectName.trim()) {
                            toast.error('Project name is required')
                            return
                          }
                          createProjectMutation.mutate({ name: newProjectName.trim() })
                        }}
                        disabled={createProjectMutation.isPending}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description..."
                rows={3}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Link href="/finance/sales">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Sales Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
