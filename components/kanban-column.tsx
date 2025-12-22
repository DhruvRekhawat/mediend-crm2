'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lead } from '@/hooks/use-leads'
import { LeadCard } from './lead-card'

interface KanbanColumnProps {
  status: string
  bucketId: string
  leads: Lead[]
  onLeadClick?: (lead: Lead) => void
  showBD?: boolean
  statusCounts?: Record<string, number>
  bucketStatuses?: string[]
}

export function KanbanColumn({
  status,
  bucketId,
  leads,
  onLeadClick,
  showBD = false,
  statusCounts = {},
  bucketStatuses = [],
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: bucketId,
  })

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        ref={setNodeRef}
        className={`h-full transition-colors ${
          isOver ? 'border-primary border-2' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{status}</CardTitle>
            <Badge variant="secondary">{leads.length}</Badge>
          </div>
          {bucketStatuses.length > 0 && Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {bucketStatuses.map((s) => {
                const count = statusCounts[s] || 0
                if (count === 0) return null
                return (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}: {count}
                  </Badge>
                )
              })}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          <SortableContext
            items={leads.map((lead) => lead.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead)}
                showBD={showBD}
                onStatusChange={(newStatus) => {
                  // This will be handled by parent component
                }}
              />
            ))}
          </SortableContext>
          {leads.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No leads
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
