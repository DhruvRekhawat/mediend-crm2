'use client'

import { CaseStage } from '@prisma/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle } from 'lucide-react'

const STAGES: Array<{
  stage: CaseStage
  label: string
  shortLabel: string
}> = [
  { stage: CaseStage.NEW_LEAD, label: 'New Lead', shortLabel: 'New' },
  { stage: CaseStage.KYP_PENDING, label: 'KYP Pending', shortLabel: 'KYP' },
  { stage: CaseStage.KYP_COMPLETE, label: 'KYP Complete', shortLabel: 'KYP ✓' },
  { stage: CaseStage.PREAUTH_RAISED, label: 'Pre-Auth Raised', shortLabel: 'Pre-Auth' },
  { stage: CaseStage.PREAUTH_COMPLETE, label: 'Pre-Auth Complete', shortLabel: 'Pre-Auth ✓' },
  { stage: CaseStage.INITIATED, label: 'Admitted', shortLabel: 'Admitted' },
  { stage: CaseStage.DISCHARGED, label: 'Discharged', shortLabel: 'Discharged' },
  { stage: CaseStage.IPD_DONE, label: 'IPD Done', shortLabel: 'Done' },
]

function getStageIndex(stage: CaseStage): number {
  return STAGES.findIndex(s => s.stage === stage)
}

function getStageStatus(currentStage: CaseStage, stage: CaseStage): 'completed' | 'current' | 'pending' {
  const currentIndex = getStageIndex(currentStage)
  const stageIndex = getStageIndex(stage)
  
  if (stageIndex < currentIndex) return 'completed'
  if (stageIndex === currentIndex) return 'current'
  return 'pending'
}

interface StageProgressProps {
  currentStage: CaseStage
  className?: string
  onStageClick?: (stage: CaseStage) => void
}

export function StageProgress({ currentStage, className, onStageClick }: StageProgressProps) {
  const currentIndex = getStageIndex(currentStage)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {STAGES.map((stageInfo, index) => {
          const status = getStageStatus(currentStage, stageInfo.stage)
          const isClickable = onStageClick && status !== 'pending'
          
          return (
            <div
              key={stageInfo.stage}
              className={cn(
                'flex flex-col items-center gap-2 min-w-[80px]',
                isClickable && 'cursor-pointer hover:opacity-80'
              )}
              onClick={() => isClickable && onStageClick?.(stageInfo.stage)}
            >
              <div className="flex items-center gap-2 w-full">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 transition-colors',
                      index <= currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
                
                {/* Stage indicator */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all',
                    status === 'completed' && 'bg-primary text-primary-foreground',
                    status === 'current' && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    status === 'pending' && 'bg-muted text-muted-foreground',
                    'w-8 h-8'
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                
                {/* Connector line */}
                {index < STAGES.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 transition-colors',
                      index < currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
              
              {/* Stage label */}
              <div className="text-center">
                <div
                  className={cn(
                    'text-xs font-medium',
                    status === 'current' && 'text-primary',
                    status === 'completed' && 'text-foreground',
                    status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {stageInfo.shortLabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Current stage description */}
      <div className="text-center text-sm text-muted-foreground mt-2">
        Current: {STAGES[currentIndex]?.label}
      </div>
    </div>
  )
}
