'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Check, Clock, FileText, Users } from 'lucide-react'

interface NoticeItem {
  id: string
  title: string
  body: string
  createdAt: string
  createdBy: { id: string; name: string }
  acknowledgedAt: string | null
  createdByMe: boolean
}

interface RecipientItem {
  id: string
  userId: string
  name: string
  email: string
  acknowledgedAt: string | null
}

interface ViewNoticesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewNoticesSheet({ open, onOpenChange }: ViewNoticesSheetProps) {
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null)
  const [recipientsModalNotice, setRecipientsModalNotice] = useState<NoticeItem | null>(null)

  const { data: notices = [], isLoading } = useQuery<NoticeItem[]>({
    queryKey: ['notices-list'],
    queryFn: () => apiGet<NoticeItem[]>('/api/notices'),
    enabled: open,
  })

  return (
    <>
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
                          <div className="flex items-center gap-1 shrink-0">
                            {n.createdByMe && (
                              <Badge variant="outline" className="text-[9px] px-1">
                                Mine
                              </Badge>
                            )}
                            {!n.createdByMe && (
                              n.acknowledgedAt ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Check className="h-2.5 w-2.5 mr-0.5" />
                                  Read
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                                  New
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.createdAt), 'PPp')}
                          {!n.createdByMe && ` · ${n.createdBy.name}`}
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
                  <div className="text-muted-foreground whitespace-pre-wrap text-sm mb-4">
                    {selectedNotice.body}
                  </div>
                  {selectedNotice.createdByMe && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setRecipientsModalNotice(selectedNotice)}
                    >
                      <Users className="h-4 w-4" />
                      View who read it
                    </Button>
                  )}
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
              <div className="text-muted-foreground whitespace-pre-wrap text-sm mb-4">
                {selectedNotice.body}
              </div>
              {selectedNotice.createdByMe && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRecipientsModalNotice(selectedNotice)}
                >
                  <Users className="h-4 w-4" />
                  View who read it
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {recipientsModalNotice && (
        <NoticeRecipientsModal
          notice={recipientsModalNotice}
          open={!!recipientsModalNotice}
          onOpenChange={(o) => !o && setRecipientsModalNotice(null)}
        />
      )}
    </>
  )
}

function NoticeRecipientsModal({
  notice,
  open,
  onOpenChange,
}: {
  notice: NoticeItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: recipients = [], isLoading } = useQuery<RecipientItem[]>({
    queryKey: ['notice-recipients', notice.id],
    queryFn: () => apiGet<RecipientItem[]>(`/api/notices/${notice.id}/recipients`),
    enabled: open && notice.createdByMe,
  })

  const acknowledged = recipients.filter((r) => r.acknowledgedAt)
  const pending = recipients.filter((r) => !r.acknowledgedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Who read &quot;{notice.title}&quot;
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Acknowledged ({acknowledged.length})
              </h4>
              {acknowledged.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">No one yet</p>
              ) : (
                <ul className="space-y-1.5 pl-6">
                  {acknowledged.map((r) => (
                    <li key={r.id} className="text-sm flex items-center justify-between gap-2">
                      <span>{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.acknowledgedAt && format(new Date(r.acknowledgedAt), 'PP')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending ({pending.length})
              </h4>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">Everyone has read it</p>
              ) : (
                <ul className="space-y-1.5 pl-6">
                  {pending.map((r) => (
                    <li key={r.id} className="text-sm text-muted-foreground">
                      {r.name}
                      {r.email && (
                        <span className="text-xs ml-1">({r.email})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
