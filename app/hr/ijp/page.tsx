'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Briefcase, Users, Plus, Clock, CheckCircle, XCircle, FileText, ExternalLink, User, Power, PowerOff } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface IJPApplication {
  id: string
  candidateName: string
  candidateEmail: string | null
  candidatePhone: string | null
  resumeUrl: string
  description: string | null
  documents: string[] | null
  status: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HIRED'
  createdAt: string
  referrer: {
    employeeCode: string
    user: {
      name: string
      email: string
    }
  }
}

interface InternalJobPosting {
  id: string
  title: string
  description: string
  department: string | null
  requirements: string | null
  isActive: boolean
  createdAt: string
  applications?: IJPApplication[]
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  SHORTLISTED: { label: 'Shortlisted', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
  HIRED: { label: 'Hired', variant: 'default' as const, icon: CheckCircle },
}

export default function HRIJPPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: postings, isLoading } = useQuery<InternalJobPosting[]>({
    queryKey: ['hr-ijp'],
    queryFn: () => apiGet<InternalJobPosting[]>('/api/hr/ijp?applications=true'),
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      description: string
      department?: string
      requirements?: string
    }) => apiPost<InternalJobPosting>('/api/hr/ijp', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-ijp'] })
      setIsCreateOpen(false)
      toast.success('Job posting created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create posting')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ postingId, isActive }: { postingId: string; isActive: boolean }) =>
      apiPatch<InternalJobPosting>(`/api/hr/ijp?postingId=${postingId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-ijp'] })
      toast.success('Posting updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const updateApplicationMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: string }) =>
      apiPatch<IJPApplication>(`/api/hr/ijp?applicationId=${applicationId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-ijp'] })
      toast.success('Application updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })

  const activePostings = postings?.filter((p) => p.isActive).length || 0
  const totalApplications = postings?.reduce((acc, p) => acc + (p.applications?.length || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Internal Job Postings</h1>
          <p className="text-muted-foreground mt-1">Manage job postings and referral applications</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Posting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
              <DialogDescription>Create a new internal job posting</DialogDescription>
            </DialogHeader>
            <CreatePostingForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Postings</CardTitle>
            <Briefcase className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePostings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Postings</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postings?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
          </CardContent>
        </Card>
      </div>

      {/* Postings */}
      <Card>
        <CardHeader>
          <CardTitle>Job Postings</CardTitle>
          <CardDescription>Manage postings and review applications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : postings && postings.length > 0 ? (
            <Tabs defaultValue={postings[0]?.id} className="w-full">
              <TabsList className="flex-wrap h-auto">
                {postings.map((posting) => (
                  <TabsTrigger key={posting.id} value={posting.id} className="relative">
                    {posting.title}
                    {!posting.isActive && (
                      <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>
                    )}
                    {(posting.applications?.length || 0) > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {posting.applications?.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {postings.map((posting) => (
                <TabsContent key={posting.id} value={posting.id} className="mt-4">
                  <div className="border rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{posting.title}</h3>
                        {posting.department && (
                          <p className="text-sm text-muted-foreground">{posting.department}</p>
                        )}
                        <p className="text-sm mt-2">{posting.description}</p>
                        {posting.requirements && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Requirements:</p>
                            <p className="text-sm text-muted-foreground">{posting.requirements}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created: {format(new Date(posting.createdAt), 'PPP')}
                        </p>
                      </div>
                      <Button
                        variant={posting.isActive ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => toggleMutation.mutate({
                          postingId: posting.id,
                          isActive: !posting.isActive,
                        })}
                        disabled={toggleMutation.isPending}
                      >
                        {posting.isActive ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Applications for this posting */}
                  <h4 className="font-medium mb-3">Applications ({posting.applications?.length || 0})</h4>
                  {posting.applications && posting.applications.length > 0 ? (
                    <div className="space-y-3">
                      {posting.applications.map((app) => {
                        const statusConfig = STATUS_CONFIG[app.status]
                        const StatusIcon = statusConfig.icon
                        return (
                          <div key={app.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="font-medium">{app.candidateName}</h4>
                                <div className="text-sm text-muted-foreground">
                                  {app.candidateEmail && <span>{app.candidateEmail}</span>}
                                  {app.candidateEmail && app.candidatePhone && <span> • </span>}
                                  {app.candidatePhone && <span>{app.candidatePhone}</span>}
                                </div>
                              </div>
                              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <User className="h-3 w-3" />
                              Referred by: {app.referrer.user.name} ({app.referrer.employeeCode})
                            </div>

                            {app.description && (
                              <p className="text-sm bg-muted/50 p-2 rounded mb-2">{app.description}</p>
                            )}

                            <div className="flex gap-2 mb-3">
                              <a
                                href={app.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                Resume
                              </a>
                              {app.documents?.map((doc, i) => (
                                <a
                                  key={i}
                                  href={doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Doc {i + 1}
                                </a>
                              ))}
                            </div>

                            {app.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateApplicationMutation.mutate({
                                    applicationId: app.id,
                                    status: 'SHORTLISTED',
                                  })}
                                  disabled={updateApplicationMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Shortlist
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateApplicationMutation.mutate({
                                    applicationId: app.id,
                                    status: 'REJECTED',
                                  })}
                                  disabled={updateApplicationMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {app.status === 'SHORTLISTED' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateApplicationMutation.mutate({
                                    applicationId: app.id,
                                    status: 'HIRED',
                                  })}
                                  disabled={updateApplicationMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark as Hired
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateApplicationMutation.mutate({
                                    applicationId: app.id,
                                    status: 'REJECTED',
                                  })}
                                  disabled={updateApplicationMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No applications yet</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No job postings yet</p>
              <p className="text-sm mt-1">Create your first posting to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CreatePostingForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { title: string; description: string; department?: string; requirements?: string }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    requirements: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: formData.title,
      description: formData.description,
      department: formData.department || undefined,
      requirements: formData.requirements || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Job Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          minLength={5}
        />
      </div>

      <div>
        <Label>Department</Label>
        <Input
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="e.g., Sales, IT, HR"
        />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the role and responsibilities..."
          rows={4}
          required
          minLength={20}
        />
      </div>

      <div>
        <Label>Requirements</Label>
        <Textarea
          value={formData.requirements}
          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
          placeholder="List required skills and qualifications..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Posting'}
        </Button>
      </div>
    </form>
  )
}

