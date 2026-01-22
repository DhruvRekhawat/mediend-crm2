'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { AnswerQueryForm } from './answer-query-form'
import { useAuth } from '@/hooks/use-auth'

interface InsuranceQuery {
  id: string
  question: string
  answer: string | null
  status: 'PENDING' | 'ANSWERED' | 'RESOLVED'
  raisedAt: string
  answeredAt: string | null
  resolvedAt: string | null
  raisedBy: {
    id: string
    name: string
    email: string
    role: string
  }
  answeredBy: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface QueryListProps {
  preAuthorizationId: string
}

export function QueryList({ preAuthorizationId }: QueryListProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: queries, isLoading } = useQuery<InsuranceQuery[]>({
    queryKey: ['queries', preAuthorizationId],
    queryFn: () => apiGet<InsuranceQuery[]>(`/api/kyp/queries?preAuthorizationId=${preAuthorizationId}`),
    enabled: !!preAuthorizationId,
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      ANSWERED: 'default',
      RESOLVED: 'outline',
    }
    const icons: Record<string, any> = {
      PENDING: Clock,
      ANSWERED: MessageSquare,
      RESOLVED: CheckCircle,
    }
    const Icon = icons[status] || Clock

    return (
      <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading queries...
        </CardContent>
      </Card>
    )
  }

  if (!queries || queries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No queries yet. Insurance team can raise queries if needed.
        </CardContent>
      </Card>
    )
  }

  const isBD = user?.role === 'BD' || user?.role === 'TEAM_LEAD'

  return (
    <div className="space-y-4">
      {queries.map((query) => (
        <Card key={query.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Question</CardTitle>
                {getStatusBadge(query.status)}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(query.raisedAt), 'PPpp')}
              </div>
            </div>
            <CardDescription>
              Asked by {query.raisedBy.name} ({query.raisedBy.role})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{query.question}</p>
            </div>

            {query.answer ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-base">Answer</CardTitle>
                  {query.answeredBy && (
                    <CardDescription>
                      Answered by {query.answeredBy.name} on {format(new Date(query.answeredAt!), 'PPpp')}
                    </CardDescription>
                  )}
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="whitespace-pre-wrap">{query.answer}</p>
                </div>
              </div>
            ) : (
              isBD && (
                <AnswerQueryForm
                  queryId={query.id}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['queries', preAuthorizationId] })
                  }}
                />
              )
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
