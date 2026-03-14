'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Check, Clock, FileText } from 'lucide-react'

interface NoticeItem {
  id: string
  title: string
  body: string
  createdAt: string
  createdBy: { id: string; name: string }
  acknowledgedAt: string | null
}

interface ViewNoticesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewNoticesSheet({ open, onOpenChange }: ViewNoticesSheetProps) {
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null)

  const { data: notices = [], isLoading } = useQuery<NoticeItem[]>({
    queryKey: ['notices-list'],
    queryFn: () => apiGet<NoticeItem[]>('/api/notices'),
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notices
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          <div className="w-full sm:w-1/2 sm:border-r flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : notices.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notices yet
                </div>
              ) : (
                <div className="space-y-2">
                  {notices.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNotice(n)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedNotice?.id === n.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm line-clamp-1">
                          {n.title}
                        </span>
                        {n.acknowledgedAt ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Read
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(n.createdAt), 'PPp')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0 hidden sm:block">
            {selectedNotice ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {format(new Date(selectedNotice.createdAt), 'PPp')} ·{' '}
                  {selectedNotice.createdBy.name}
                </p>
                <h3 className="text-lg font-semibold mb-2">{selectedNotice.title}</h3>
                <div className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {selectedNotice.body}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                Select a notice to view
              </div>
            )}
          </div>
        </div>
        {selectedNotice && (
          <div className="sm:hidden p-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              {format(new Date(selectedNotice.createdAt), 'PPp')} ·{' '}
              {selectedNotice.createdBy.name}
            </p>
            <h3 className="text-lg font-semibold mb-2">{selectedNotice.title}</h3>
            <div className="text-muted-foreground whitespace-pre-wrap text-sm">
              {selectedNotice.body}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
