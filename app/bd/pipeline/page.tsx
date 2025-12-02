'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { KanbanBoard } from '@/components/kanban-board'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLead } from '@/hooks/use-leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function BDPipelinePage() {
  const { user } = useAuth()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const { lead, updateLead } = useLead(selectedLeadId || '')

  const filters = user?.role === 'BD' ? { bdId: user.id } : {}

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-[calc(100vw-3rem)]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">My Pipeline</h1>
            <p className="text-muted-foreground mt-1">Manage your leads</p>
          </div>

          <KanbanBoard
            filters={filters}
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

