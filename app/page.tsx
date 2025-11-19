import { redirect } from 'next/navigation'

export default async function Home() {
  // Always redirect to admin dashboard
  redirect('/admin/dashboard')
}
