'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { AIFloatingButton } from './ai-floating-button'
import { AIChatSheet } from './ai-chat-sheet'

const AIContext = createContext<{ openAI: () => void } | null>(null)

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) return null
  return ctx
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const openAI = useCallback(() => setIsOpen(true), [])

  return (
    <AIContext.Provider value={{ openAI }}>
      {children}
      <AIFloatingButton onClick={openAI} />
      <AIChatSheet open={isOpen} onOpenChange={setIsOpen} />
    </AIContext.Provider>
  )
}
