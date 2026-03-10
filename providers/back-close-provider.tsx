"use client"

import React, { useCallback, useEffect, useRef } from "react"

type CloseFn = () => void

const BackCloseContext = React.createContext<{
  register: (close: CloseFn) => () => void
} | null>(null)

export function BackCloseProvider({ children }: { children: React.ReactNode }) {
  const stackRef = useRef<CloseFn[]>([])
  const register = useCallback((close: CloseFn) => {
    stackRef.current.push(close)
    return () => {
      const arr = stackRef.current
      const i = arr.indexOf(close)
      if (i !== -1) arr.splice(i, 1)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const stack = stackRef.current
      if (stack.length === 0) return
      const close = stack[stack.length - 1]
      stack.pop()
      close()
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  return (
    <BackCloseContext.Provider value={{ register }}>
      {children}
    </BackCloseContext.Provider>
  )
}

export function useBackClose(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined
) {
  const ctx = React.useContext(BackCloseContext)
  const unregisterRef = useRef<(() => void) | null>(null)
  const pushedRef = useRef(false)
  const closedByBackRef = useRef(false)

  // When open becomes true: push state and register. When open becomes false: unregister and maybe history.back().
  useEffect(() => {
    if (open !== true || typeof onOpenChange !== "function" || !ctx) return

    closedByBackRef.current = false
    window.history.pushState({ backClose: true }, "")
    pushedRef.current = true

    unregisterRef.current = ctx.register(() => {
      closedByBackRef.current = true
      onOpenChange(false)
    })

    return () => {
      unregisterRef.current?.()
      unregisterRef.current = null
      if (pushedRef.current && !closedByBackRef.current) {
        window.history.back()
      }
      pushedRef.current = false
    }
  }, [open, onOpenChange, ctx])

  // Cleanup if component unmounts while open
  useEffect(() => {
    return () => {
      unregisterRef.current?.()
      unregisterRef.current = null
    }
  }, [])
}
