"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type StatCardAccent =
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "red"
  | "orange"
  | "emerald"
  | "teal"
  | "neutral"

const accentStyles: Record<
  StatCardAccent,
  { border: string; value: string }
> = {
  blue: {
    border: "border-l-blue-500",
    value: "text-blue-600 dark:text-blue-400",
  },
  green: {
    border: "border-l-green-500",
    value: "text-green-600 dark:text-green-400",
  },
  amber: {
    border: "border-l-amber-500",
    value: "text-amber-600 dark:text-amber-400",
  },
  purple: {
    border: "border-l-purple-500",
    value: "text-purple-600 dark:text-purple-400",
  },
  red: {
    border: "border-l-red-500",
    value: "text-red-600 dark:text-red-400",
  },
  orange: {
    border: "border-l-orange-500",
    value: "text-orange-600 dark:text-orange-400",
  },
  emerald: {
    border: "border-l-emerald-500",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  teal: {
    border: "border-l-teal-500",
    value: "text-teal-600 dark:text-teal-400",
  },
  neutral: {
    border: "border-l-border",
    value: "text-foreground",
  },
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short label above the value (e.g. "Total", "Completed") */
  label: string
  /** Main value to display (number, string, or ReactNode) */
  value: React.ReactNode
  /** Accent color for the left border and optional value color */
  accent?: StatCardAccent
  /** If true, the value uses the accent color; if false, uses default foreground */
  valueAccent?: boolean
}

function StatCard({
  label,
  value,
  accent = "neutral",
  valueAccent = false,
  className,
  ...props
}: StatCardProps) {
  const styles = accentStyles[accent]
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "rounded-lg border border-border border-l-4 bg-card px-3 py-3 shadow-sm",
        styles.border,
        className
      )}
      {...props}
    >
      <p className="text-sm md:text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold",
          valueAccent ? styles.value : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

export { StatCard }
