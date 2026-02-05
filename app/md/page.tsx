import { redirect } from 'next/navigation'

/**
 * /md has no index content. Redirect to the canonical MD landing page.
 * MD/ADMIN users land on /md/sales per getDashboardUrl in sidebar-nav.
 */
export default function MDIndexPage() {
  redirect('/md/sales')
}
