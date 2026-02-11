'use client'

import { cn } from '@/lib/utils'

export type TabVariant = 'core-hr' | 'financial' | 'support' | 'mental-health'

const variantStyles: Record<
  TabVariant,
  { active: string; inactive: string; list: string }
> = {
  'core-hr': {
    active: 'bg-green-600 text-white border-green-600',
    inactive:
      'border-border bg-muted/30 text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-200',
    list: 'border-b border-border gap-0',
  },
  financial: {
    active: 'bg-teal-600 text-white border-teal-600',
    inactive:
      'border-border bg-muted/30 text-muted-foreground hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200',
    list: 'border-b border-border gap-0',
  },
  support: {
    active: 'bg-emerald-700 text-white border-emerald-700',
    inactive:
      'border-border bg-muted/30 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200',
    list: 'border-b border-border gap-0',
  },
  'mental-health': {
    active: 'bg-rose-600 text-white border-rose-600',
    inactive:
      'border-border bg-muted/30 text-muted-foreground hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200',
    list: 'border-b border-border gap-0',
  },
}

export interface TabItem {
  value: string
  label: string
}

interface TabNavigationProps {
  tabs: TabItem[]
  value: string
  onValueChange: (value: string) => void
  variant?: TabVariant
  className?: string
}

export function TabNavigation({
  tabs,
  value,
  onValueChange,
  variant = 'core-hr',
  className,
}: TabNavigationProps) {
  const styles = variantStyles[variant]

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div
        role="tablist"
        className={cn(
          'flex border-b border-border -mb-px whitespace-nowrap',
          styles.list,
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onValueChange(tab.value)}
              className={cn(
                'inline-flex items-center justify-center rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0',
                isActive ? styles.active : styles.inactive
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
