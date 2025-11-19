import { cookies } from 'next/headers'
import { RolesClient } from './roles-client'

export default async function RolesPage() {
  // Fetch roles from API route
  const cookieStore = await cookies()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'
  
  const response = await fetch(`${baseUrl}/api/roles`, {
    cache: 'no-store',
    headers: {
      Cookie: cookieStore.toString(),
    },
  })

  let roles = []
  let count = 0

  if (response.ok) {
    const data = await response.json()
    roles = data.data || []
    count = data.count || 0
  }

  return (
    <RolesClient 
      initialRoles={roles} 
      initialCount={count} 
    />
  )
}
