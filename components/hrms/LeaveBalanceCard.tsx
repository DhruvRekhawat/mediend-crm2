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

export function LeaveBalanceCard({ balances }: LeaveBalanceCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {balances.map((balance) => {
        const percentage = balance.allocated > 0
          ? (balance.used / balance.allocated) * 100
          : 0

        return (
          <Card key={balance.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {balance.leaveType.name}
                {balance.carryForward && (
                  <Badge variant="outline" className="text-xs">carries forward</Badge>
                )}
                {balance.isProbation && balance.locked != null && balance.locked > 0 && (
                  <Badge variant="secondary" className="text-xs">locked</Badge>
                )}
              </CardTitle>
              <CardDescription>Leave Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balance.locked != null && balance.locked > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Locked (probation)</span>
                    <Badge variant="secondary">{balance.locked} days</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Allocated</span>
                  <Badge variant="secondary">{balance.allocated} days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <Badge variant="outline">{balance.used} days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <Badge variant={balance.remaining > 0 ? 'default' : 'destructive'}>
                    {balance.remaining} days
                  </Badge>
                </div>
                {balance.allocated > 0 && (
                  <>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {percentage.toFixed(1)}% used
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

