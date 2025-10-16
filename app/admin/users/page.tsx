import { cookies } from 'next/headers'
import { AdminUsersClient } from '@/app/admin/users/admin-users-client'

export default async function AdminUsersPage() {
  // Fetch admin users from API route (uses service role, bypasses RLS)
  const cookieStore = await cookies()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'
  
  const response = await fetch(`${baseUrl}/api/admin-users`, {
    cache: 'no-store',
    headers: {
      Cookie: cookieStore.toString(),
    },
  })

  let adminUsers = []
  let count = 0

  if (response.ok) {
    const data = await response.json()
    adminUsers = data.data || []
    count = data.count || 0
  }

  return (
    <AdminUsersClient 
      initialAdminUsers={adminUsers} 
      initialCount={count} 
    />
  )
}
