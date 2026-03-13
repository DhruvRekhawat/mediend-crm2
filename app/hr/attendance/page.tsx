import { redirect } from 'next/navigation'

export default function HRAttendanceRedirect() {
  redirect('/hr/attendance-leaves?tab=attendance')
}
