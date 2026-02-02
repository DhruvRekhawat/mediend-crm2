'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIFloatingButtonProps {
  onClick: () => void
}

export function AIFloatingButton({ onClick }: AIFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'h-16 w-16 rounded-full',
        'bg-gradient-to-br from-purple-600 via-purple-500 to-white',
        'bg-[length:300%_300%]',
        'shadow-lg shadow-purple-500/50',
        'flex items-center justify-center',
        'transition-all duration-300',
        'hover:scale-110 hover:shadow-xl hover:shadow-purple-500/60',
        'active:scale-95',
        'animate-[gradient-rotate_4s_ease_infinite]',
        isHovered && 'ring-4 ring-purple-300/50'
      )}
      aria-label="Open mediendAI"
    >
      <Sparkles 
        className={cn(
          'h-8 w-8 text-white',
          'transition-transform duration-300',
          isHovered && 'scale-110 rotate-12'
        )}
      />
    </button>
  )
}
