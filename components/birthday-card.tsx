'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Cake, Sparkles, PartyPopper } from 'lucide-react'

interface BirthdayResponse {
  isBirthday: boolean
  name?: string
  age?: number
}

export function BirthdayCard() {

  const { data } = useQuery<BirthdayResponse>({
    queryKey: ['birthday-check'],
    queryFn: () => apiGet<BirthdayResponse>('/api/employee/birthday'),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })


  if (!data?.isBirthday) {
    return null
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white border-0 shadow-xl">


      <CardContent className="relative py-8 text-center">
        <div className="flex justify-center gap-4 mb-4">
          <PartyPopper className="h-10 w-10 animate-bounce" style={{ animationDelay: '0s' }} />
          <Cake className="h-12 w-12 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <Sparkles className="h-10 w-10 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>

        <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
          🎂 Happy Birthday! 🎂
        </h2>
        
        <p className="text-xl font-medium mb-2">
          Dear {data.name?.split(' ')[0]},
        </p>
        
        <p className="text-lg opacity-90 mb-4">
          Wishing you a fantastic {data.age ? `${data.age}th` : ''} birthday filled with joy, laughter, and success!
        </p>

        <p className="text-sm opacity-80">
          From your Mediend family 💝
        </p>
      </CardContent>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 4s linear infinite;
        }
      `}</style>
    </Card>
  )
}

