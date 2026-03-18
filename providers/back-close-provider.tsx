"use client"

import React, { useCallback, useEffect, useRef } from "react"

type CloseFn = () => void

const BackCloseContext = React.createContext<{
  register: (close: CloseFn) => () => void
  consumeHistoryEntry: () => void
} | null>(null)

export function BackCloseProvider({ children }: { children: React.ReactNode }) {
  const stackRef = useRef<CloseFn[]>([])
  const suppressedPopRef = useRef(0)
  const register = useCallback((close: CloseFn) => {
    stackRef.current.push(close)
    return () => {
      const arr = stackRef.current
      const i = arr.indexOf(close)
      if (i !== -1) arr.splice(i, 1)
    }
  }, [])
  const consumeHistoryEntry = useCallback(() => {
    suppressedPopRef.current += 1
    window.history.back()
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      if (suppressedPopRef.current > 0) {
        suppressedPopRef.current -= 1
        return
      }
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
    <BackCloseContext.Provider value={{ register, consumeHistoryEntry }}>
      {children}
    </BackCloseContext.Provider>
  )
}

export function useBackClose(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  skipBackOnCloseRef?: React.RefObject<boolean>
) {
  const ctx = React.useContext(BackCloseContext)
  const unregisterRef = useRef<(() => void) | null>(null)
  const pushedRef = useRef(false)
  const closedByBackRef = useRef(false)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  // When open becomes true: push state and register. When open becomes false: unregister and maybe history.back().
  useEffect(() => {
    if (open !== true || typeof onOpenChangeRef.current !== "function" || !ctx) return

    closedByBackRef.current = false
    window.history.pushState({ backClose: true }, "")
    pushedRef.current = true

    unregisterRef.current = ctx.register(() => {
      closedByBackRef.current = true
      onOpenChangeRef.current?.(false)
    })

    return () => {
      unregisterRef.current?.()
      unregisterRef.current = null
      if (pushedRef.current && !closedByBackRef.current) {
        if (skipBackOnCloseRef?.current) {
          skipBackOnCloseRef.current = false
        } else {
          ctx.consumeHistoryEntry()
        }
      }
      pushedRef.current = false
    }
  }, [open, ctx, skipBackOnCloseRef])

  // Cleanup if component unmounts while open
  useEffect(() => {
    return () => {
      unregisterRef.current?.()
      unregisterRef.current = null
    }
  }, [])
}
