'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { Briefcase, Users, Send, Clock, CheckCircle, XCircle, FileText, Link, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface InternalJobPosting {
  id: string
  title: string
  description: string
  department: string | null
  requirements: string | null
  isActive: boolean
  createdAt: string
}

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
  posting: InternalJobPosting
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  SHORTLISTED: { label: 'Shortlisted', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
  HIRED: { label: 'Hired', variant: 'default' as const, icon: CheckCircle },
}

export default function EmployeeIJPPage() {
  const queryClient = useQueryClient()

  const { data: postings, isLoading: loadingPostings } = useQuery<InternalJobPosting[]>({
    queryKey: ['ijp-postings'],
    queryFn: () => apiGet<InternalJobPosting[]>('/api/hr/ijp?active=true'),
  })

  const { data: myReferrals, isLoading: loadingReferrals } = useQuery<IJPApplication[]>({
    queryKey: ['my-referrals'],
    queryFn: () => apiGet<IJPApplication[]>('/api/employee/ijp'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Internal Job Postings</h1>
        <p className="text-muted-foreground mt-1">Refer candidates for open positions</p>
      </div>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Open Positions
          </CardTitle>
          <CardDescription>Submit referrals for available positions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPostings ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : postings && postings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {postings.map((posting) => (
                <div key={posting.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg">{posting.title}</h3>
                  {posting.department && (
                    <p className="text-sm text-muted-foreground">{posting.department}</p>
                  )}
                  <p className="text-sm mt-2 line-clamp-3">{posting.description}</p>
                  {posting.requirements && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Requirements:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{posting.requirements}</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <ReferralDialog
                      posting={posting}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-referrals'] })}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No open positions at the moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Referrals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Referrals
          </CardTitle>
          <CardDescription>Track the status of your submitted referrals</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReferrals ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : myReferrals && myReferrals.length > 0 ? (
            <div className="space-y-4">
              {myReferrals.map((referral) => {
                const statusConfig = STATUS_CONFIG[referral.status]
                const StatusIcon = statusConfig.icon
                return (
                  <div key={referral.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-medium">{referral.candidateName}</h3>
                        <p className="text-sm text-muted-foreground">
                          For: {referral.posting.title}
                        </p>
                      </div>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {format(new Date(referral.createdAt), 'PPP')}
                    </p>
                    {referral.description && (
                      <p className="text-sm mt-2 bg-muted/50 p-2 rounded">{referral.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <a
                        href={referral.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Resume
                      </a>
                      {referral.documents?.map((doc, i) => (
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
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals submitted yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReferralDialog({
  posting,
  onSuccess,
}: {
  posting: InternalJobPosting
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    resumeUrl: '',
    description: '',
  })
  const [documents, setDocuments] = useState<string[]>([])
  const [newDocUrl, setNewDocUrl] = useState('')

  const submitMutation = useMutation({
    mutationFn: (data: {
      postingId: string
      candidateName: string
      candidateEmail?: string
      candidatePhone?: string
      resumeUrl: string
      description?: string
      documents?: string[]
    }) => apiPost<IJPApplication>('/api/employee/ijp', data),
    onSuccess: () => {
      setOpen(false)
      setFormData({
        candidateName: '',
        candidateEmail: '',
        candidatePhone: '',
        resumeUrl: '',
        description: '',
      })
      setDocuments([])
      toast.success('Referral submitted successfully')
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit referral')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate({
      postingId: posting.id,
      candidateName: formData.candidateName,
      candidateEmail: formData.candidateEmail || undefined,
      candidatePhone: formData.candidatePhone || undefined,
      resumeUrl: formData.resumeUrl,
      description: formData.description || undefined,
      documents: documents.length > 0 ? documents : undefined,
    })
  }

  const addDocument = () => {
    if (newDocUrl && documents.length < 3) {
      try {
        new URL(newDocUrl)
        setDocuments([...documents, newDocUrl])
        setNewDocUrl('')
      } catch {
        toast.error('Please enter a valid URL')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Send className="h-4 w-4 mr-2" />
          Submit Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refer a Candidate</DialogTitle>
          <DialogDescription>
            For: {posting.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Candidate Name *</Label>
            <Input
              value={formData.candidateName}
              onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.candidateEmail}
                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.candidatePhone}
                onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Resume URL *</Label>
            <Input
              value={formData.resumeUrl}
              onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Why is this candidate a good fit?"
              rows={3}
            />
          </div>

          <div>
            <Label>Additional Documents (max 3)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                placeholder="Document URL"
                disabled={documents.length >= 3}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addDocument}
                disabled={documents.length >= 3 || !newDocUrl}
              >
                Add
              </Button>
            </div>
            {documents.length > 0 && (
              <div className="space-y-1 mt-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded text-sm">
                    <Link className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit Referral'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

