import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { extractSubdomain, getRestaurantBySubdomainAsync } from '@/lib/subdomain-mapping'

export default async function Home() {
  // Check if we're on a branded subdomain
  const headersList = headers()
  const host = headersList.get('host') || ''
  const subdomain = extractSubdomain(host)
  
  if (subdomain) {
    // On a branded subdomain - redirect to the restaurant page
    const mapping = await getRestaurantBySubdomainAsync(subdomain)
    if (mapping) {
      redirect(`/r/${mapping.slug}`)
    }
  }
  
  // Default: redirect to admin login page
  redirect('/login')
}
