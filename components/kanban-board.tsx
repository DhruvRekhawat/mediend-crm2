'use client'

import React, { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import { useLeads, LeadFilters, Lead } from '@/hooks/use-leads'
import { KanbanColumn } from './kanban-column'
import { LeadCard } from './lead-card'

const LEAD_STATUSES = [
  'Hot Lead',
  'Interested',
  'Follow-up (1-3)',
  'Call Back (SD)',
  'Call Back (T)',
  'Call Back Next Week',
  'Call Back Next Month',
  'IPD Schedule',
  'IPD Done',
  'Closed',
  'Lost',
  'DNP (1-5, Exhausted)',
  'Invalid Number',
  'Fund Issues',
  'Call Done',
  'C/W Done',
]

interface KanbanBoardProps {
  filters?: LeadFilters
  showBDColumn?: boolean
  onLeadClick?: (lead: Lead) => void
}

export function KanbanBoard({ filters = {}, showBDColumn = false, onLeadClick }: KanbanBoardProps) {
  const { leads, updateLead } = useLeads(filters)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    LEAD_STATUSES.forEach((status) => {
      grouped[status] = []
    })

    leads.forEach((lead) => {
      const status = lead.status || 'Other'
      if (grouped[status]) {
        grouped[status].push(lead)
      } else {
        // Handle unknown statuses
        if (!grouped['Other']) {
          grouped['Other'] = []
        }
        grouped['Other'].push(lead)
      }
    })

    return grouped
  }, [leads])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    let newStatus = over.id as string

    // If dropped on a card, find its status
    if (!LEAD_STATUSES.includes(newStatus)) {
      const droppedLead = leads.find((l) => l.id === newStatus)
      if (droppedLead) {
        newStatus = droppedLead.status || ''
      } else {
        return
      }
    }

    const currentLead = leads.find((l) => l.id === leadId)
    if (currentLead && currentLead.status !== newStatus) {
      updateLead({ id: leadId, data: { status: newStatus } })
    }
  }

  const activeLead = useMemo(() => {
    if (!activeId) return null
    return leads.find((lead) => lead.id === activeId)
  }, [activeId, leads])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((status) => {
          const statusLeads = leadsByStatus[status] || []
          return (
            <KanbanColumn
              key={status}
              status={status}
              leads={statusLeads}
              onLeadClick={onLeadClick}
              showBD={showBDColumn}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="opacity-90">
            <LeadCard lead={activeLead} showBD={showBDColumn} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

