'use client'

import { useState } from 'react'
import { AIFloatingButton } from './ai-floating-button'
import { AIChatSheet } from './ai-chat-sheet'

export function AIProvider() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <AIFloatingButton onClick={() => setIsOpen(true)} />
      <AIChatSheet open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
