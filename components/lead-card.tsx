'use client'

import { useSortable } from '@dnd-kit/sortable'
import { Lead } from '@/hooks/use-leads'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Building2, User } from 'lucide-react'
import { format } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
  showBD?: boolean
}

export function LeadCard({ lead, onClick, showBD = false }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow mb-2"
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-sm">{lead.patientName}</h4>
            <Badge variant="outline" className="text-xs">
              {lead.leadRef}
            </Badge>
          </div>

          {showBD && lead.bd && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{lead.bd.name}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{lead.hospitalName}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{lead.city}</span>
          </div>

          <div className="text-xs font-medium">{lead.treatment}</div>

          {/* {lead.updatedDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Updated {format(new Date(lead.updatedDate), 'MMM d, yyyy')}</span>
            </div>
          )} */}

          {lead.source && (
            <Badge variant="secondary" className="text-xs">
              {lead.source}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

