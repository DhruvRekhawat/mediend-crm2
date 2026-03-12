import { redirect } from 'next/navigation'

/**
 * Team leads use the same pipeline as BD. Serve BD pipeline at this URL so no client redirect.
 */
export { default } from '@/app/bd/pipeline/page'
