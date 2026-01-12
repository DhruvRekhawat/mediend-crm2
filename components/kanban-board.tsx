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

/**
 * Normalize status to match expected status values
 * This handles variations like "New Lead" -> "New"
 */
function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'New'
  
  const normalized = status.trim()
  
  // Map common variations to expected status names
  const statusMap: Record<string, string> = {
    'new lead': 'New',
    'new': 'New',
    'hot lead': 'Hot Lead',
    'hot': 'Hot Lead',
    'interested': 'Interested',
    'follow-up (1-3)': 'Follow-up (1-3)',
    'follow up (1-3)': 'Follow-up (1-3)',
    'call back (sd)': 'Call Back (SD)',
    'call back (t)': 'Call Back (T)',
    'call back next week': 'Call Back Next Week',
    'call back next month': 'Call Back Next Month',
    'ipd schedule': 'IPD Schedule',
    'ipd done': 'IPD Done',
    'closed': 'Closed',
    'call done': 'Call Done',
    'c/w done': 'C/W Done',
    'lost': 'Lost',
    'dnp': 'DNP',
    'dnp (1-5, exhausted)': 'DNP (1-5, Exhausted)',
    'junk': 'Junk',
    'invalid number': 'Invalid Number',
    'fund issues': 'Fund Issues',
  }
  
  const lowerStatus = normalized.toLowerCase()
  return statusMap[lowerStatus] || normalized // Return mapped status or original if no mapping
}

// All available statuses
export const ALL_LEAD_STATUSES = [
  'New',
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
  'DNP',
  'DNP (1-5, Exhausted)',
  'Junk',
  'Invalid Number',
  'Fund Issues',
  'Call Done',
  'C/W Done',
] as const

// Status buckets for kanban view (grouped visually)
export const STATUS_BUCKETS = [
  {
    id: 'new-hot',
    name: 'New & Hot',
    statuses: ['New', 'Hot Lead', 'Interested'],
    color: 'bg-red-50 border-red-200',
  },
  {
    id: 'follow-ups',
    name: 'Follow-ups',
    statuses: ['Follow-up (1-3)', 'Call Back (SD)', 'Call Back (T)', 'Call Back Next Week', 'Call Back Next Month'],
    color: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'scheduled',
    name: 'Scheduled',
    statuses: ['IPD Schedule'],
    color: 'bg-yellow-50 border-yellow-200',
  },
  {
    id: 'completed',
    name: 'Completed',
    statuses: ['IPD Done', 'Closed', 'Call Done', 'C/W Done'],
    color: 'bg-green-50 border-green-200',
  },
  {
    id: 'lost-inactive',
    name: 'Lost/Inactive',
    statuses: ['Lost', 'DNP', 'DNP (1-5, Exhausted)', 'Junk', 'Invalid Number', 'Fund Issues'],
    color: 'bg-gray-50 border-gray-200',
  },
] as const

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

  // Group leads by bucket
  const leadsByBucket = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    
    STATUS_BUCKETS.forEach((bucket) => {
      grouped[bucket.id] = []
    })

    // Also track unknown statuses
    grouped['other'] = []

    leads.forEach((lead) => {
      // Normalize status to handle variations like "New Lead" -> "New"
      const normalizedStatus = normalizeStatus(lead.status)
      let found = false
      
      // Find which bucket this status belongs to
      for (const bucket of STATUS_BUCKETS) {
        if ((bucket.statuses as readonly string[]).includes(normalizedStatus)) {
          grouped[bucket.id].push(lead)
          found = true
          break
        }
      }
      
      if (!found) {
        grouped['other'].push(lead)
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
    const targetBucketId = over.id as string

    // If dropped on another lead card, find that lead's bucket
    if (targetBucketId.startsWith('lead-')) {
      const targetLeadId = targetBucketId.replace('lead-', '')
      const targetLead = leads.find((l) => l.id === targetLeadId)
      if (targetLead && targetLead.status) {
        // Find which bucket this status belongs to
        for (const bucket of STATUS_BUCKETS) {
          if ((bucket.statuses as readonly string[]).includes(targetLead.status)) {
            const currentLead = leads.find((l) => l.id === leadId)
            if (currentLead && currentLead.status !== targetLead.status) {
              updateLead({ id: leadId, data: { status: targetLead.status } })
            }
            return
          }
        }
      }
      return
    }

    // Find the target bucket
    const targetBucket = STATUS_BUCKETS.find((b) => b.id === targetBucketId)
    if (!targetBucket) return

    const currentLead = leads.find((l) => l.id === leadId)
    if (!currentLead) return

    // If dropped on a bucket, use the first status of that bucket
    // Or keep current status if it's already in that bucket
    const currentStatus = currentLead.status || ''
    const isAlreadyInBucket = (targetBucket.statuses as readonly string[]).includes(currentStatus)
    
    if (!isAlreadyInBucket) {
      // Move to first status of the target bucket
      const newStatus = targetBucket.statuses[0]
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
        {STATUS_BUCKETS.map((bucket) => {
          const bucketLeads = leadsByBucket[bucket.id] || []
          const totalCount = bucketLeads.length
          
          // Count by status within bucket
          const statusCounts: Record<string, number> = {}
          bucket.statuses.forEach((status) => {
            statusCounts[status] = bucketLeads.filter((l) => l.status === status).length
          })

          return (
            <KanbanColumn
              key={bucket.id}
              status={bucket.name}
              bucketId={bucket.id}
              leads={bucketLeads}
              onLeadClick={onLeadClick}
              showBD={showBDColumn}
              statusCounts={statusCounts}
              bucketStatuses={[...bucket.statuses]}
            />
          )
        })}
        {leadsByBucket['other'] && leadsByBucket['other'].length > 0 && (
          <KanbanColumn
            status="Other"
            bucketId="other"
            leads={leadsByBucket['other']}
            onLeadClick={onLeadClick}
            showBD={showBDColumn}
            statusCounts={{}}
            bucketStatuses={[]}
          />
        )}
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
