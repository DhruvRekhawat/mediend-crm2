'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { KanbanBoard } from '@/components/kanban-board'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { User } from '@prisma/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLead } from '@/hooks/use-leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { toast } from 'sonner'

export default function TeamLeadPipelinePage() {
  const { user } = useAuth()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const { lead, updateLead } = useLead(selectedLeadId)

  const { data: teamBDs } = useQuery<User[]>({
    queryKey: ['users', 'team', user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return []
      return apiGet<User[]>(`/api/users?teamId=${user.teamId}&role=BD`)
    },
    enabled: !!user?.teamId,
  })

  const filters = user?.teamId ? { teamId: user.teamId } : {}

  const handleReassign = (newBdId: string) => {
    if (!selectedLeadId) return
    updateLead({ bdId: newBdId })
    toast.success('Lead reassigned successfully')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-[calc(100vw-3rem)]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Team Pipeline</h1>
            <p className="text-muted-foreground mt-1">Manage leads for your team</p>
          </div>

          <KanbanBoard
            filters={filters}
            showBDColumn={true}
            onLeadClick={(lead) => setSelectedLeadId(lead.id)}
          />

          <Sheet open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Lead Details</SheetTitle>
                <SheetDescription>View and update lead information</SheetDescription>
              </SheetHeader>

              {lead && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient Name</Label>
                      <Input value={lead.patientName || ''} readOnly />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input type="number" value={lead.age || ''} readOnly />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={lead.phoneNumber || ''} readOnly />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={lead.city || ''} readOnly />
                    </div>
                    <div>
                      <Label>Hospital</Label>
                      <Input value={lead.hospitalName || ''} readOnly />
                    </div>
                    <div>
                      <Label>Treatment</Label>
                      <Input value={lead.treatment || ''} readOnly />
                    </div>
                  </div>

                  <div>
                    <Label>Assign to BD</Label>
                    <Select
                      value={(lead.bdId as string) || ''}
                      onValueChange={handleReassign}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {lead.bd?.name || 'Select BD'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamBDs?.map((bd: User) => (
                          <SelectItem key={bd.id} value={bd.id}>
                            {bd.name} ({bd.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Remarks</Label>
                    <Textarea
                      value={lead.remarks || ''}
                      onChange={(e) => updateLead({ remarks: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        updateLead({ status: 'IPD Done', pipelineStage: 'INSURANCE' })
                        setSelectedLeadId(null)
                      }}
                    >
                      Mark as IPD Done
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedLeadId(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </ProtectedRoute>
  )
}

