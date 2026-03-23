'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

export function CopyLeadRefButton({ leadRef, className }: { leadRef: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      void navigator.clipboard.writeText(leadRef).then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1000)
      })
    },
    [leadRef]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground ${className ?? ''}`}
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy lead reference'}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}
