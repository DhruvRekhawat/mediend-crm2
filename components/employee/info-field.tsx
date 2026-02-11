'use client'

import { LucideIcon } from 'lucide-react'

interface InfoFieldProps {
  icon: LucideIcon
  label: string
  value: React.ReactNode
}

export function InfoField({ icon: Icon, label, value }: InfoFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
