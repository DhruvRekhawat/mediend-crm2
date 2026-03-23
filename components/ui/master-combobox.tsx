'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export type MasterType = 'hospitals' | 'doctors' | 'tpas' | 'anesthesia'

const MASTER_PATH: Record<MasterType, string> = {
  hospitals: '/api/masters/hospitals',
  doctors: '/api/masters/doctors',
  tpas: '/api/masters/tpas',
  anesthesia: '/api/masters/anesthesia',
}

export interface MasterItem {
  id: string
  name: string
  address?: string | null
  googleMapLink?: string | null
  isActive: boolean
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export interface MasterComboboxProps {
  masterType: MasterType
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  className?: string
}

export function MasterCombobox({
  masterType,
  value,
  onChange,
  id,
  label,
  placeholder = 'Search or type a value…',
  disabled,
  required,
  error,
  className,
}: MasterComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const debouncedSearch = useDebouncedValue(inputValue, 250)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const path = MASTER_PATH[masterType]
  const { data, isFetching } = useQuery({
    queryKey: ['masters', masterType, debouncedSearch],
    queryFn: async () => {
      const q = debouncedSearch.trim()
      const url = `${path}?search=${encodeURIComponent(q)}`
      return apiGet<{ items: MasterItem[] }>(url)
    },
    enabled: !disabled,
    staleTime: 30_000,
  })

  const items = data?.items ?? []

  const commitFreeText = React.useCallback(() => {
    const v = inputValue.trim()
    onChange(v)
    setOpen(false)
  }, [inputValue, onChange])

  const selectItem = (item: MasterItem) => {
    onChange(item.name)
    setInputValue(item.name)
    setOpen(false)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              id={id}
              value={inputValue}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="off"
              onChange={(e) => {
                setInputValue(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  commitFreeText()
                }, 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (items[0]) selectItem(items[0])
                  else commitFreeText()
                }
                if (e.key === 'Escape') {
                  setOpen(false)
                  setInputValue(value)
                }
              }}
              className={cn(error && 'border-destructive')}
            />
            {isFetching && (
              <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-anchor-width,24rem)] max-w-[min(100vw,32rem)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="h-[min(280px,var(--radix-scroll-area-viewport-height))]">
            <div className="p-1">
              {items.length === 0 && !isFetching && (
                <p className="text-muted-foreground px-2 py-3 text-sm">
                  No matches. Press Enter to use your text.
                </p>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="hover:bg-accent flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectItem(item)
                  }}
                >
                  <span className="font-medium">{item.name}</span>
                  {masterType === 'hospitals' && item.address && (
                    <span className="text-muted-foreground line-clamp-1 text-xs">{item.address}</span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  )
}
