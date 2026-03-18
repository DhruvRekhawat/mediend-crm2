'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Target, Users, TrendingUp, Zap, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLE_METRICS: Record<string, string> = {
  SALES_HEAD: 'IPD_DONE',
  HR_HEAD: 'HEAD_COUNT',
  DIGITAL_MARKETING_HEAD: 'LEADS_GENERATED',
  IT_HEAD: 'REVENUE',
}

const AVATAR_COLORS: Record<string, string> = {
  SALES_HEAD: 'bg-emerald-500/20 text-emerald-700',
  HR_HEAD: 'bg-violet-500/20 text-violet-700',
  DIGITAL_MARKETING_HEAD: 'bg-sky-500/20 text-sky-700',
  IT_HEAD: 'bg-amber-500/20 text-amber-700',
}

const METRIC_LABELS: Record<string, string> = {
  IPD_DONE: 'IPD Done',
  HEAD_COUNT: 'New Hires',
  LEADS_GENERATED: 'Leads',
  REVENUE: 'Revenue (₹)',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function formatValue(value: number, metric: string): string {
  if (metric === 'REVENUE') {
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
    return `₹${value.toLocaleString()}`
  }
  return value.toLocaleString()
}

function getMonthBounds(monthOffset: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + monthOffset)
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export interface AddTargetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillHeadId?: string | null
  onSuccess?: () => void
}

export function AddTargetDrawer({
  open,
  onOpenChange,
  prefillHeadId,
  onSuccess,
}: AddTargetDrawerProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedHead, setSelectedHead] = useState<{
    id: string
    name: string
    role: string
    profilePicture: string | null
    departmentLabel: string
  } | null>(null)
  const [targetValue, setTargetValue] = useState('')

  const { start, end } = getMonthBounds(0)

  const { data: headsData = [] } = useQuery({
    queryKey: ['md-head-targets'],
    queryFn: () => apiGet<Array<{ head: { id: string; name: string; role: string; profilePicture: string | null; departmentLabel: string } }>>('/api/md/head-targets'),
    enabled: open,
  })

  const heads = headsData.map((i) => i.head)

  const { data: achievementData } = useQuery({
    queryKey: ['head-target-achievement', selectedHead?.id],
    queryFn: () =>
      apiGet<{
        metric: string
        currentMonth: { month: string; actual: number; targetValue: number }
        history: Array<{ month: string; actual: number; targetValue: number }>
        departmentBreakdown: Array<{ departmentId: string; departmentName: string; currentCount: number; addedInPeriod: number }>
      }>(`/api/md/head-targets/achievement?headUserId=${selectedHead?.id}`),
    enabled: !!selectedHead?.id && open && step === 2,
  })

  const createMutation = useMutation({
    mutationFn: (data: { headUserId: string; metric: string; targetValue: number }) =>
      apiPost('/api/md/head-targets', {
        ...data,
        periodStartDate: start.toISOString(),
        periodEndDate: end.toISOString(),
        periodType: 'MONTH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-head-targets'] })
      queryClient.invalidateQueries({ queryKey: ['head-target-achievement'] })
      toast.success('Target set successfully')
      onSuccess?.()
      handleClose()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to set target')
    },
  })

  useEffect(() => {
    if (open && prefillHeadId) {
      const head = heads.find((h) => h.id === prefillHeadId)
      if (head) {
        setSelectedHead(head)
        setStep(2)
      }
    }
  }, [open, prefillHeadId, heads])

  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedHead(null)
      setTargetValue('')
    }
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
    setSelectedHead(null)
    setTargetValue('')
  }

  const handleSelectHead = (head: (typeof heads)[0]) => {
    setSelectedHead(head)
    setStep(2)
    setTargetValue('')
  }

  const handleBack = () => {
    setStep(1)
    setSelectedHead(null)
    setTargetValue('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = metric === 'REVENUE' ? parseFloat(targetValue.replace(/,/g, '')) : parseInt(targetValue, 10)
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid target value')
      return
    }
    if (!selectedHead) return
    createMutation.mutate({
      headUserId: selectedHead.id,
      metric,
      targetValue: val,
    })
  }

  const metric = selectedHead ? ROLE_METRICS[selectedHead.role] ?? 'IPD_DONE' : 'IPD_DONE'
  const history = achievementData?.history ?? []
  const currentMonth = achievementData?.currentMonth
  const departmentBreakdown = achievementData?.departmentBreakdown ?? []
  const recentMonths = [currentMonth, ...history].filter(
    (m): m is { month: string; actual: number; targetValue: number } => m != null
  ).slice(0, 3)

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()} direction="bottom">
      <DrawerContent className="max-h-[90dvh] rounded-t-2xl flex flex-col">
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
        <DrawerHeader className="flex flex-row items-center gap-4 border-b px-6 py-4">
          {step === 2 && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <DrawerTitle className="flex-1">
            {step === 1 ? 'Select Department Head' : 'Set Target'}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid gap-3 sm:grid-cols-2 pt-2"
                >
                  {heads.map((head) => (
                    <button
                      key={head.id}
                      type="button"
                      onClick={() => handleSelectHead(head)}
                      className={cn(
                        'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                        'hover:border-primary/50 hover:bg-muted/50 active:scale-[0.99]'
                      )}
                    >
                      <Avatar className={cn('size-12 shrink-0', AVATAR_COLORS[head.role] ?? 'bg-muted')}>
                        <AvatarImage src={head.profilePicture ?? undefined} />
                        <AvatarFallback className="font-semibold">
                          {getInitials(head.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{head.name}</p>
                        <p className="text-sm text-muted-foreground">{head.departmentLabel}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.form
                  key="step2"
                  id="add-target-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit(e)
                  }}
                  className="space-y-6 pt-4"
                >
                  {selectedHead && (
                    <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                      <Avatar className={cn('size-12 shrink-0', AVATAR_COLORS[selectedHead.role] ?? 'bg-muted')}>
                        <AvatarImage src={selectedHead.profilePicture ?? undefined} />
                        <AvatarFallback className="font-semibold">
                          {getInitials(selectedHead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{selectedHead.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedHead.departmentLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Sales: IPD stats + input */}
                  {metric === 'IPD_DONE' && (
                    <>
                      {recentMonths.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">IPD in previous months</Label>
                          <div className="flex gap-2 flex-wrap">
                            {recentMonths.map((m) => (
                              <div
                                key={m.month}
                                className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                              >
                                <span className="text-muted-foreground">{m.month}:</span>{' '}
                                <span className="font-medium">{m.actual}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="target">Target IPD this month</Label>
                        <Input
                          id="target"
                          type="number"
                          min={1}
                          placeholder="e.g. 30"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* HR: Department breakdown + total input */}
                  {metric === 'HEAD_COUNT' && (
                    <>
                      {departmentBreakdown.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Current headcount by department</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {departmentBreakdown.map((d) => (
                              <div
                                key={d.departmentId}
                                className="flex justify-between rounded-lg border px-3 py-2 text-sm"
                              >
                                <span>{d.departmentName}</span>
                                <span className="font-medium">{d.currentCount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="target">Target new hires this month</Label>
                        <Input
                          id="target"
                          type="number"
                          min={1}
                          placeholder="e.g. 8"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Digital: Leads stats + input */}
                  {metric === 'LEADS_GENERATED' && (
                    <>
                      {recentMonths.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Leads in previous months</Label>
                          <div className="flex gap-2 flex-wrap">
                            {recentMonths.map((m) => (
                              <div
                                key={m.month}
                                className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                              >
                                <span className="text-muted-foreground">{m.month}:</span>{' '}
                                <span className="font-medium">{m.actual}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="target">Target leads this month</Label>
                        <Input
                          id="target"
                          type="number"
                          min={1}
                          placeholder="e.g. 50"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* IT: Revenue input */}
                  {metric === 'REVENUE' && (
                    <>
                      {recentMonths.length > 0 && recentMonths.some((m) => m.actual > 0) && (
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Revenue in previous months</Label>
                          <div className="flex gap-2 flex-wrap">
                            {recentMonths.map((m) => (
                              <div
                                key={m.month}
                                className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                              >
                                <span className="text-muted-foreground">{m.month}:</span>{' '}
                                <span className="font-medium">{formatValue(m.actual, 'REVENUE')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="target">Target revenue this month (₹)</Label>
                        <Input
                          id="target"
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 500000"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {step === 2 && (
          <DrawerFooter className="border-t px-6 py-4">
            <Button
              type="submit"
              form="add-target-form"
              disabled={createMutation.isPending || !targetValue.trim()}
            >
              {createMutation.isPending ? 'Setting...' : 'Set Target'}
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
