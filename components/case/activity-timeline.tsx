'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { CaseStage } from '@prisma/client'
import { CheckCircle2, FileText, Clock, Activity, Receipt, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function getStageColor(stage: CaseStage): { bg: string; border: string; text: string; dot: string; connector: string; icon: React.ReactNode } {
  const colors: Record<CaseStage, { bg: string; border: string; text: string; dot: string; connector: string; icon: React.ReactNode }> = {
    [CaseStage.NEW_LEAD]: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500 dark:bg-blue-400',
      connector: 'bg-blue-300 dark:bg-blue-700',
      icon: <FileText className="w-3 h-3" />,
    },
    [CaseStage.KYP_PENDING]: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500 dark:bg-amber-400',
      connector: 'bg-amber-300 dark:bg-amber-700',
      icon: <Clock className="w-3 h-3" />,
    },
    [CaseStage.KYP_COMPLETE]: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500 dark:bg-green-400',
      connector: 'bg-green-300 dark:bg-green-700',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    [CaseStage.PREAUTH_RAISED]: {
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800',
      text: 'text-teal-700 dark:text-teal-300',
      dot: 'bg-teal-500 dark:bg-teal-400',
      connector: 'bg-teal-300 dark:bg-teal-700',
      icon: <FileText className="w-3 h-3" />,
    },
    [CaseStage.PREAUTH_COMPLETE]: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500 dark:bg-blue-400',
      connector: 'bg-blue-300 dark:bg-blue-700',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    [CaseStage.INITIATED]: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500 dark:bg-green-400',
      connector: 'bg-green-300 dark:bg-green-700',
      icon: <Activity className="w-3 h-3" />,
    },
    [CaseStage.ADMITTED]: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500 dark:bg-green-400',
      connector: 'bg-green-300 dark:bg-green-700',
      icon: <Activity className="w-3 h-3" />,
    },
    [CaseStage.DISCHARGED]: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      dot: 'bg-orange-500 dark:bg-orange-400',
      connector: 'bg-orange-300 dark:bg-orange-700',
      icon: <Receipt className="w-3 h-3" />,
    },
    [CaseStage.IPD_DONE]: {
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800',
      text: 'text-teal-700 dark:text-teal-300',
      dot: 'bg-teal-500 dark:bg-teal-400',
      connector: 'bg-teal-300 dark:bg-teal-700',
      icon: <Shield className="w-3 h-3" />,
    },
    [CaseStage.PL_PENDING]: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      dot: 'bg-gray-500 dark:bg-gray-400',
      connector: 'bg-gray-300 dark:bg-gray-700',
      icon: <Clock className="w-3 h-3" />,
    },
    [CaseStage.OUTSTANDING]: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      dot: 'bg-gray-500 dark:bg-gray-400',
      connector: 'bg-gray-300 dark:bg-gray-700',
      icon: <Clock className="w-3 h-3" />,
    },
  }
  return colors[stage] || {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500 dark:bg-gray-400',
    connector: 'bg-gray-300 dark:bg-gray-700',
    icon: <Clock className="w-3 h-3" />,
  }
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
    <Card className={cn('border-2 shadow-sm', className)}>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {history.map((entry, index) => {
            const stageColor = getStageColor(entry.toStage)
            return (
              <div key={entry.id}>
                <div className="flex items-start gap-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2',
                      stageColor.bg,
                      stageColor.border,
                      stageColor.text
                    )}>
                      {stageColor.icon}
                    </div>
                    {index < history.length - 1 && (
                      <div className={cn('w-0.5 h-full min-h-[60px] mt-2', stageColor.connector)} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className={cn(
                      'rounded-lg border-l-4 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50',
                      stageColor.border
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn('border-0', stageColor.bg, stageColor.text)}>
                          {STAGE_LABELS[entry.toStage]}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.changedBy.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{entry.changedBy.role}</p>
                      {entry.note && (
                        <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">{entry.note}</p>
                      )}
                    </div>
                  </div>
                </div>
                {index < history.length - 1 && <Separator className="my-2" />}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
