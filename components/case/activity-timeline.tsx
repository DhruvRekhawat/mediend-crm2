'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { CaseStage } from '@prisma/client'

interface StageHistoryEntry {
  id: string
  fromStage: CaseStage | null
  toStage: CaseStage
  changedAt: string
  note: string | null
  changedBy: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface ActivityTimelineProps {
  history: StageHistoryEntry[]
  className?: string
}

const STAGE_LABELS: Record<CaseStage, string> = {
  NEW_LEAD: 'New Lead',
  KYP_PENDING: 'KYP Pending',
  KYP_COMPLETE: 'KYP Complete',
  PREAUTH_RAISED: 'Pre-Auth Raised',
  PREAUTH_COMPLETE: 'Pre-Auth Complete',
  INITIATED: 'Admitted',
  ADMITTED: 'Admitted',
  DISCHARGED: 'Discharged',
  IPD_DONE: 'IPD Done',
  PL_PENDING: 'PL Pending',
  OUTSTANDING: 'Outstanding',
}

export function ActivityTimeline({ history, className }: ActivityTimelineProps) {
  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                  {index < history.length - 1 && (
                    <div className="w-0.5 h-full min-h-[60px] bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">
                      {STAGE_LABELS[entry.toStage]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{entry.changedBy.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.changedBy.role}</p>
                  {entry.note && (
                    <p className="text-sm mt-2 text-muted-foreground">{entry.note}</p>
                  )}
                </div>
              </div>
              {index < history.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
