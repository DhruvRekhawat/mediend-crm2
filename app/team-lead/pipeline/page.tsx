'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Team leads use the same pipeline as BD. Redirect to BD pipeline.
 */
export default function TeamLeadPipelinePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/bd/pipeline')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Redirecting to pipeline...
    </div>
  )
}
