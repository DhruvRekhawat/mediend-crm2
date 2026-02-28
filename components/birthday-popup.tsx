'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'
import Script from 'next/script'

const BIRTHDAY_DISMISSED_KEY = 'birthday-popup-dismissed'

interface BirthdayResponse {
  isBirthday: boolean
  name?: string
  age?: number
}

function runConfetti() {
  const duration = 3 * 1000
  const end = Date.now() + duration
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff']

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

export function BirthdayPopup() {
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)
  const confettiOnce = useRef(false)

  const { data } = useQuery<BirthdayResponse>({
    queryKey: ['birthday-check'],
    queryFn: () => apiGet<BirthdayResponse>('/api/employee/birthday'),
    staleTime: 1000 * 60 * 60,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const wasDismissed = sessionStorage.getItem(BIRTHDAY_DISMISSED_KEY)
    if (wasDismissed === 'true') setDismissed(true)
    setReady(true)
  }, [])

  const isBirthday = data?.isBirthday && !dismissed && ready

  useEffect(() => {
    if (!isBirthday || !data?.isBirthday) return
    if (confettiOnce.current) return
    confettiOnce.current = true
    runConfetti()
  }, [isBirthday, data?.isBirthday])

  const handleClose = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(BIRTHDAY_DISMISSED_KEY, 'true')
    }
  }

  if (!data?.isBirthday || dismissed || !ready) {
    return null
  }

  const firstName = data.name?.split(' ')[0] ?? 'there'

  return (
    <>
      <Script src="https://tenor.com/embed.js" strategy="lazyOnload" />
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/95 via-pink-900/95 to-orange-900/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/20 text-white hover:bg-white/30"
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
            🎂 Happy Birthday! 🎂
          </h1>
          <p className="mt-4 text-2xl font-medium text-white/95 md:text-3xl">
            Dear {firstName},
          </p>
          <p className="mt-2 text-lg text-white/90 md:text-xl">
            Wishing you a fantastic {data.age ? `${data.age}th ` : ''}birthday filled with joy,
            laughter, and success!
          </p>
          <p className="mt-4 text-sm text-white/80">From your Mediend family 💝</p>

          <div className="mt-8 w-full max-w-[280px] [&_.tenor-gif-embed]:!max-w-full">
            <div
              className="tenor-gif-embed mx-auto"
              data-postid="7319868932938175422"
              data-share-method="host"
              data-aspect-ratio="1"
              data-width="100%"
            >
              <a href="https://tenor.com/view/pengu-pudgy-penguin-pudgypenguins-happy-birthday-gif-7319868932938175422">
                Pengu Pudgy Sticker
              </a>
            </div>
          </div>
        </div>

        {/* Balloon swarm from below */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-3xl md:text-4xl"
              style={{
                left: `${(i * 4.2) % 98}%`,
                bottom: '-5%',
                animation: `balloon-rise 10s ease-in ${i * 0.25}s infinite`,
              }}
            >
              🎈
            </span>
          ))}
        </div>
      </div>
      <style jsx global>{`
        @keyframes balloon-rise {
          0% {
            transform: translateY(0) scale(0.9);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-130vh) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
