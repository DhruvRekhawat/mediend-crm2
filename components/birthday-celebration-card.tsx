'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cake } from 'lucide-react'

interface BirthdayItem {
  id: string
  userId: string
  name: string
  dateOfBirth: string
}

export function BirthdayCelebrationCard() {
  const { data: birthdays = [], isLoading } = useQuery<BirthdayItem[]>({
    queryKey: ['birthdays-today'],
    queryFn: () => apiGet<BirthdayItem[]>('/api/employees/birthdays'),
  })

  if (isLoading || birthdays.length === 0) return null

  return (
    <Card className="border-pink-200 dark:border-pink-900/50 bg-pink-50/30 dark:bg-pink-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          Today&apos;s Birthdays 🎂
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {birthdays.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-pink-200 dark:border-pink-900/50 bg-white/60 dark:bg-pink-950/30 px-3 py-2"
            >
              <span className="text-lg">🎈</span>
              <span className="font-medium">{item.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Wish them a happy birthday!
        </p>
      </CardContent>
    </Card>
  )
}
