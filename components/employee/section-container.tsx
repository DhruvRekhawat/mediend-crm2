'use client'

import { cn } from '@/lib/utils'

export type SectionColorVariant =
  | 'blue'
  | 'green'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'purple'
  | 'rose'
  | 'indigo'
  | 'cyan'
  | 'default'

const colorVariants: Record<
  SectionColorVariant,
  { bg: string; border: string; title: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-green-900',
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    title: 'text-teal-900',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    title: 'text-emerald-900',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-amber-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    title: 'text-purple-900',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    title: 'text-rose-900',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    title: 'text-indigo-900',
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    title: 'text-cyan-900',
  },
  default: {
    bg: 'bg-card',
    border: 'border-border',
    title: 'text-foreground',
  },
}

interface SectionContainerProps {
  children: React.ReactNode
  className?: string
  /** Optional title - no CardHeader, just a simple heading */
  title?: string
  /** Color variant for the section background */
  variant?: SectionColorVariant
}

/**
 * Lightweight section wrapper with colorful backgrounds. Use instead of Card for filters, loading states,
 * or simple grouped content where CardHeader is unnecessary.
 */
export function SectionContainer({
  children,
  className,
  title,
  variant = 'default',
}: SectionContainerProps) {
  const colors = colorVariants[variant]

  return (
    <div
      className={cn(
        'rounded-xl border py-4 px-6 shadow-sm',
        colors.bg,
        colors.border,
        className
      )}
    >
      {title && (
        <h2 className={cn('text-lg font-semibold mb-4', colors.title)}>{title}</h2>
      )}
      {children}
    </div>
  )
}
