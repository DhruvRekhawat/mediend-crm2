'use client'

/**
 * AuthenticatedLayout is now a simple wrapper component.
 * The sidebar is handled at the root layout level via AuthenticatedWrapper.
 * This component is kept for backward compatibility but no longer adds the sidebar.
 */
export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

