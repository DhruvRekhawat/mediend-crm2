"use client"

import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriorityIconProps {
  priority: string
  className?: string
}

/** Renders Flag for GENERAL/LOW/MEDIUM, "!" for HIGH, "!!" for URGENT. */
export function PriorityIcon({ priority, className }: PriorityIconProps) {
  if (priority === "HIGH") {
    return (
      <span className={cn("inline-flex min-w-[1em] items-center justify-center font-bold leading-none", className)} aria-hidden>
        !
      </span>
    )
  }
  if (priority === "URGENT") {
    return (
      <span className={cn("inline-flex min-w-[1.25em] items-center justify-center font-bold leading-none", className)} aria-hidden>
        !!
      </span>
    )
  }
  return <Flag className={cn("shrink-0", className)} aria-hidden />
}
