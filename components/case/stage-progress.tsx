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
  { stage: CaseStage.KYP_BASIC_PENDING, label: 'KYP Basic', shortLabel: 'KYP 1' },
  { stage: CaseStage.KYP_BASIC_COMPLETE, label: 'Hospitals Suggested', shortLabel: 'Hosp' },
  { stage: CaseStage.KYP_DETAILED_PENDING, label: 'KYP Detailed', shortLabel: 'KYP 2' },
  { stage: CaseStage.KYP_DETAILED_COMPLETE, label: 'KYP Complete', shortLabel: 'KYP ✓' },
  { stage: CaseStage.PREAUTH_RAISED, label: 'Pre-Auth Raised', shortLabel: 'Pre-Auth' },
  { stage: CaseStage.PREAUTH_COMPLETE, label: 'Pre-Auth Complete', shortLabel: 'Pre-Auth ✓' },
  { stage: CaseStage.INITIATED, label: 'Admitted', shortLabel: 'Admitted' },
  { stage: CaseStage.DISCHARGED, label: 'Discharged', shortLabel: 'Discharged' },
]

function getStageIndex(stage: CaseStage): number {
  const inStages = STAGES.findIndex(s => s.stage === stage)
  if (inStages >= 0) return inStages
  // Legacy or extra stages: map to nearest visible stage
  const legacyToNew: Partial<Record<CaseStage, CaseStage>> = {
    [CaseStage.KYP_PENDING]: CaseStage.KYP_BASIC_PENDING,
    [CaseStage.KYP_COMPLETE]: CaseStage.KYP_DETAILED_COMPLETE,
    [CaseStage.ADMITTED]: CaseStage.INITIATED,
    [CaseStage.IPD_DONE]: CaseStage.DISCHARGED,
    [CaseStage.PL_PENDING]: CaseStage.DISCHARGED,
    [CaseStage.OUTSTANDING]: CaseStage.DISCHARGED,
  }
  const mapped = legacyToNew[stage] ?? stage
  return STAGES.findIndex(s => s.stage === mapped)
}

function getStageStatus(currentStage: CaseStage, stage: CaseStage): 'completed' | 'current' | 'pending' {
  const currentIndex = getStageIndex(currentStage)
  const stageIndex = getStageIndex(stage)
  
  if (stageIndex < currentIndex) return 'completed'
  if (stageIndex === currentIndex) return 'current'
  return 'pending'
}

function getStageColor(stage: CaseStage): { bg: string; border: string; text: string; connector: string } {
  const colors: Record<CaseStage, { bg: string; border: string; text: string; connector: string }> = {
    [CaseStage.NEW_LEAD]: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      connector: 'bg-blue-300 dark:bg-blue-700',
    },
    [CaseStage.KYP_BASIC_PENDING]: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      connector: 'bg-amber-300 dark:bg-amber-700',
    },
    [CaseStage.KYP_BASIC_COMPLETE]: {
      bg: 'bg-emerald-100 dark:bg-emerald-900',
      border: 'border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      connector: 'bg-emerald-300 dark:bg-emerald-700',
    },
    [CaseStage.KYP_DETAILED_PENDING]: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      connector: 'bg-amber-300 dark:bg-amber-700',
    },
    [CaseStage.KYP_DETAILED_COMPLETE]: {
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      connector: 'bg-green-300 dark:bg-green-700',
    },
    [CaseStage.KYP_PENDING]: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      connector: 'bg-amber-300 dark:bg-amber-700',
    },
    [CaseStage.KYP_COMPLETE]: {
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      connector: 'bg-green-300 dark:bg-green-700',
    },
    [CaseStage.PREAUTH_RAISED]: {
      bg: 'bg-teal-100 dark:bg-teal-900',
      border: 'border-teal-300 dark:border-teal-700',
      text: 'text-teal-700 dark:text-teal-300',
      connector: 'bg-teal-300 dark:bg-teal-700',
    },
    [CaseStage.PREAUTH_COMPLETE]: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      connector: 'bg-blue-300 dark:bg-blue-700',
    },
    [CaseStage.INITIATED]: {
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      connector: 'bg-green-300 dark:bg-green-700',
    },
    [CaseStage.ADMITTED]: {
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      connector: 'bg-green-300 dark:bg-green-700',
    },
    [CaseStage.DISCHARGED]: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      border: 'border-orange-300 dark:border-orange-700',
      text: 'text-orange-700 dark:text-orange-300',
      connector: 'bg-orange-300 dark:bg-orange-700',
    },
    [CaseStage.IPD_DONE]: {
      bg: 'bg-teal-100 dark:bg-teal-900',
      border: 'border-teal-300 dark:border-teal-700',
      text: 'text-teal-700 dark:text-teal-300',
      connector: 'bg-teal-300 dark:bg-teal-700',
    },
    [CaseStage.PL_PENDING]: {
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      connector: 'bg-gray-300 dark:bg-gray-700',
    },
    [CaseStage.OUTSTANDING]: {
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      connector: 'bg-gray-300 dark:bg-gray-700',
    },
  }
  return colors[stage] || {
    bg: 'bg-gray-100 dark:bg-gray-900',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    connector: 'bg-gray-300 dark:bg-gray-700',
  }
}

function getStageColors(stage: CaseStage): { gradient: string, bgGradient: string, textColor: string, connectorColor: string } {
  const colors: Record<CaseStage, { gradient: string, bgGradient: string, textColor: string, connectorColor: string }> = {
    [CaseStage.NEW_LEAD]: {
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-400 to-cyan-400',
      textColor: 'text-blue-600 dark:text-blue-400',
      connectorColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    },
    [CaseStage.KYP_BASIC_PENDING]: {
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-400 to-amber-400',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      connectorColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    },
    [CaseStage.KYP_BASIC_COMPLETE]: {
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-400 to-teal-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      connectorColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    },
    [CaseStage.KYP_DETAILED_PENDING]: {
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-400 to-amber-400',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      connectorColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    },
    [CaseStage.KYP_DETAILED_COMPLETE]: {
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-400 to-emerald-400',
      textColor: 'text-green-600 dark:text-green-400',
      connectorColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
    [CaseStage.KYP_PENDING]: {
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-400 to-amber-400',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      connectorColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    },
    [CaseStage.KYP_COMPLETE]: {
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-400 to-emerald-400',
      textColor: 'text-green-600 dark:text-green-400',
      connectorColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
    [CaseStage.PREAUTH_RAISED]: {
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-400 to-pink-400',
      textColor: 'text-purple-600 dark:text-purple-400',
      connectorColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    },
    [CaseStage.PREAUTH_COMPLETE]: {
      gradient: 'from-indigo-500 to-blue-500',
      bgGradient: 'from-indigo-400 to-blue-400',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      connectorColor: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    },
    [CaseStage.INITIATED]: {
      gradient: 'from-cyan-500 to-teal-500',
      bgGradient: 'from-cyan-400 to-teal-400',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      connectorColor: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    },
    [CaseStage.ADMITTED]: {
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-400 to-green-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      connectorColor: 'bg-gradient-to-r from-emerald-500 to-green-500',
    },
    [CaseStage.DISCHARGED]: {
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-400 to-amber-400',
      textColor: 'text-orange-600 dark:text-orange-400',
      connectorColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
    },
    [CaseStage.IPD_DONE]: {
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-400 to-cyan-400',
      textColor: 'text-teal-600 dark:text-teal-400',
      connectorColor: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    },
    [CaseStage.PL_PENDING]: {
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-400 to-rose-400',
      textColor: 'text-pink-600 dark:text-pink-400',
      connectorColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
    },
    [CaseStage.OUTSTANDING]: {
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-400 to-rose-400',
      textColor: 'text-red-600 dark:text-red-400',
      connectorColor: 'bg-gradient-to-r from-red-500 to-rose-500',
    },
  }
  return colors[stage] || {
    gradient: 'from-gray-500 to-gray-600',
    bgGradient: 'from-gray-400 to-gray-500',
    textColor: 'text-gray-600 dark:text-gray-400',
    connectorColor: 'bg-gray-400',
  }
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
      <div className="relative pb-4">
        {/* Continuous background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 z-0" />
        
        {/* Colored segments for completed stages */}
        {STAGES.map((stageInfo, index) => {
          if (index >= currentIndex) return null
          const stageColor = getStageColor(stageInfo.stage)
          const nextStageColor = index < STAGES.length - 1 ? getStageColor(STAGES[index + 1].stage) : null
          const segmentColor = nextStageColor?.connector || stageColor.connector
          
          return (
            <div
              key={`segment-${index}`}
              className={cn('absolute h-0.5 z-0 top-4', segmentColor)}
              style={{
                left: `${(index + 0.5) * (100 / STAGES.length)}%`,
                width: `${100 / STAGES.length}%`,
              }}
            />
          )
        })}
        
        {/* Stages container */}
        <div className="relative flex items-center">
          {STAGES.map((stageInfo, index) => {
            const status = getStageStatus(currentStage, stageInfo.stage)
            const isClickable = onStageClick && status !== 'pending'
            const stageColor = getStageColor(stageInfo.stage)
            
            return (
              <div
                key={stageInfo.stage}
                className={cn(
                  'flex flex-col items-center gap-2 flex-1',
                  isClickable && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => isClickable && onStageClick?.(stageInfo.stage)}
              >
                {/* Stage indicator */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all border-2 relative z-10',
                    status === 'completed' && `${stageColor.bg} ${stageColor.text} ${stageColor.border}`,
                    status === 'current' && `${stageColor.bg} ${stageColor.text} ${stageColor.border} ring-2 ring-offset-2`,
                    status === 'pending' && 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700',
                    'w-8 h-8',
                    status === 'current' && 'animate-pulse'
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                
                {/* Stage label */}
                <div className="text-center">
                  <div
                    className={cn(
                      'text-xs font-medium',
                      status === 'current' && stageColor.text,
                      status === 'completed' && stageColor.text,
                      status === 'pending' && 'text-gray-400 dark:text-gray-600'
                    )}
                  >
                    {stageInfo.shortLabel}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Current stage description */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
        Current: {STAGES[currentIndex]?.label}
      </div>
    </div>
  )
}
