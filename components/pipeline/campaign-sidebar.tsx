'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useMemo, useRef, useState } from 'react'

export type CampaignSelection = { type: 'all' } | { type: 'campaign'; circle: string; campaignLabel: string }

const CIRCLE_DOT: Record<string, string> = {
  Delhi: '#007AFF',
  Hyderabad: '#AF52DE',
  Lucknow: '#FF9500',
  Mumbai: '#34C759',
  Pune: '#FF3B30',
}

function dotForCircle(circle: string) {
  const k = Object.keys(CIRCLE_DOT).find((c) => c.toLowerCase() === circle.trim().toLowerCase())
  return k ? CIRCLE_DOT[k] : '#8E8E93'
}

export function buildCampaignTree(leads: { circle?: string | null; campaignName?: string | null }[]) {
  const map = new Map<string, Map<string, number>>()
  for (const l of leads) {
    const circle = (l.circle?.trim() || 'Unknown').replace(/\s+/g, ' ')
    const camp = (l.campaignName?.trim() || 'No campaign').replace(/\s+/g, ' ')
    if (!map.has(circle)) map.set(circle, new Map())
    const inner = map.get(circle)!
    inner.set(camp, (inner.get(camp) ?? 0) + 1)
  }
  const circles = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  return circles.map(([circle, camps]) => ({
    circle,
    total: [...camps.values()].reduce((s, n) => s + n, 0),
    campaigns: [...camps.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name)),
  }))
}

function buildTreeFingerprint(leads: { circle?: string | null; campaignName?: string | null }[]): string {
  const map = new Map<string, number>()
  for (const l of leads) {
    const key = `${(l.circle?.trim() || 'Unknown').replace(/\s+/g, ' ')}\t${(l.campaignName?.trim() || 'No campaign').replace(/\s+/g, ' ')}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|')
}

export const CampaignSidebar = memo(function CampaignSidebar({
  leads,
  selection,
  onSelect,
  className,
}: {
  leads: { circle?: string | null; campaignName?: string | null }[]
  selection: CampaignSelection
  onSelect: (s: CampaignSelection) => void
  className?: string
}) {
  const fingerprint = useMemo(() => buildTreeFingerprint(leads), [leads])
  const prevRef = useRef<{ fp: string; tree: ReturnType<typeof buildCampaignTree> }>({ fp: '', tree: [] })
  const tree = useMemo(() => {
    if (prevRef.current.fp === fingerprint) return prevRef.current.tree
    const built = buildCampaignTree(leads)
    prevRef.current = { fp: fingerprint, tree: built }
    return built
  }, [fingerprint, leads])
  const [openCircles, setOpenCircles] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    for (const { circle } of tree) o[circle] = true
    return o
  })

  const totalLeads = leads.length

  return (
    <aside
      className={cn(
        'flex w-[248px] shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-muted/30 py-3 pl-2 pr-1',
        className
      )}
    >
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Circles</p>
      <button
        type="button"
        onClick={() => onSelect({ type: 'all' })}
        className={cn(
          'mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
          selection.type === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/80'
        )}
      >
        <span>All leads</span>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-semibold',
            selection.type === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {totalLeads}
        </span>
      </button>

      {tree.map(({ circle, total, campaigns }) => {
        const open = openCircles[circle] ?? true
        const sid = `c_${circle}`
        return (
          <div key={circle} className="mb-0.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/60"
              onClick={() => setOpenCircles((p) => ({ ...p, [circle]: !open }))}
            >
              {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotForCircle(circle) }} />
              <span className="flex-1 truncate text-[13px] font-semibold text-foreground/90">{circle}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{total}</span>
            </button>
            {open && (
              <div className="ml-1 space-y-0.5 border-l border-border/50 pl-2">
                {campaigns.map(({ name, count }) => {
                  const key = `${circle}\t${name}`
                  const isActive = selection.type === 'campaign' && selection.circle === circle && selection.campaignLabel === name
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelect({ type: 'campaign', circle, campaignLabel: name })}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-all',
                        isActive
                          ? 'bg-primary font-medium text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-foreground/80 hover:bg-muted/70'
                      )}
                    >
                      <span className="line-clamp-2 flex-1">{name}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                          isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
})
