import { redirect } from 'next/navigation'

export default function HRLeavesRedirect() {
  redirect('/hr/attendance-leaves?tab=leaves')
}
