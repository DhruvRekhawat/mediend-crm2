'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getFilteredNavItemsWithUrls } from '@/lib/sidebar-nav'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps = {} as CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen: (value: boolean) => void = onOpenChange || ((value: boolean) => setInternalOpen(value))

  // Get accessible navigation items
  const navItems = useMemo(() => {
    return getFilteredNavItemsWithUrls(user ?? null)
  }, [user])

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return navItems.slice(0, 30) // Limit to 30 items when no search
    }

    const query = searchQuery.toLowerCase()
    return navItems
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query)
        const urlMatch = item.url.toLowerCase().includes(query)
        return titleMatch || urlMatch
      })
      .slice(0, 30) // Limit results
  }, [navItems, searchQuery])

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  // Keyboard shortcut handler (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
      if (event.key === 'Escape' && open) {
        setOpen(false)
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } else {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredItems[selectedIndex].url)
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && filteredItems.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, filteredItems.length])

  const handleSelect = (url: string) => {
    router.push(url)
    setOpen(false)
    setSearchQuery('')
    setSelectedIndex(0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Search Pages</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-9 h-12 text-base"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <Command className="h-3 w-3" />
                K
              </kbd>
            </div>
          </div>
        </div>
        <div className="border-t px-2 py-2 max-h-[400px] overflow-y-auto" ref={resultsRef}>
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No pages found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selectedIndex
                return (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => handleSelect(item.url)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {filteredItems.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>
                {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
              </span>
              <span className="flex items-center gap-2">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ↑↓
                </kbd>
                <span>Navigate</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  Enter
                </kbd>
                <span>Select</span>
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
