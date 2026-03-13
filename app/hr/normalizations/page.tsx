import { redirect } from 'next/navigation'

export default function HRNormalizationsRedirect() {
  redirect('/hr/attendance-leaves?tab=normalizations')
}
