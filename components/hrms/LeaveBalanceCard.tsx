'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface LeaveBalance {
  id: string
  allocated: number
  used: number
  remaining: number
  locked?: number
  isProbation?: boolean
  carryForward?: boolean
  leaveType: {
    id: string
    name: string
    maxDays: number
  }
}

interface LeaveBalanceCardProps {
  balances: LeaveBalance[]
}

function leaveTypeHint(name: string, carryForward?: boolean): string {
  if (name === 'EL' || carryForward) return 'Carries to next year'
  if (name === 'CL') return 'Resets every year'
  if (name === 'SL') return 'Resets every year'
  return ''
}

export function LeaveBalanceCard({ balances }: LeaveBalanceCardProps) {
  const totalRemaining = balances.reduce((sum, b) => sum + b.remaining, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm font-medium text-muted-foreground">Total leave available</p>
        <p className="text-3xl font-bold tabular-nums">
          {totalRemaining.toFixed(1)} days
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {balances.map((b) => `${b.leaveType.name}: ${b.remaining}`).join(' · ')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {balances.map((balance) => {
          const percentage = balance.allocated > 0
            ? (balance.used / balance.allocated) * 100
            : 0

          return (
            <Card key={balance.id} className={balance.remaining <= 0 ? 'opacity-80' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {balance.leaveType.name}
                  {balance.carryForward && (
                    <Badge variant="outline" className="text-xs font-normal">carries forward</Badge>
                  )}
                  {balance.isProbation && balance.locked != null && balance.locked > 0 && (
                    <Badge variant="secondary" className="text-xs">locked</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {leaveTypeHint(balance.leaveType.name, balance.carryForward)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Available to use</p>
                  <p className={`text-2xl font-bold tabular-nums ${balance.remaining > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {balance.remaining} days
                  </p>
                </div>
                {balance.locked != null && balance.locked > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Locked (probation): {balance.locked} days
                  </p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Used {balance.used} of {balance.allocated}</span>
                </div>
                {balance.allocated > 0 && (
                  <Progress value={percentage} className="h-1.5" />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

