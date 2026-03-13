import { redirect } from 'next/navigation'

export default function HRLeaveTypesRedirect() {
  redirect('/hr/attendance-leaves?tab=leave-types')
}
