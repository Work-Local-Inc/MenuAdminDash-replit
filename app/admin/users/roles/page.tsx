import { cookies, headers } from 'next/headers'
import { RolesClient } from './roles-client'

export default async function RolesPage() {
  // Fetch roles from API route using the request origin
  const cookieStore = await cookies()
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:5000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`
  
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
