import { redirect } from 'next/navigation'

export default function HRLeaveBalancesRedirect() {
  redirect('/hr/attendance-leaves?tab=leave-balances')
}
