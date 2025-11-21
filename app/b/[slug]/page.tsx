import { redirect } from 'next/navigation'
import { extractIdFromSlug } from '@/lib/utils/slugify'

interface PageProps {
  params: {
    slug: string
  }
}

export default function BuilderShortcutPage({ params }: PageProps) {
  // Extract restaurant ID from slug (e.g., "econo-pizza-1009" → 1009)
  const restaurantId = extractIdFromSlug(params.slug)
  
  if (!restaurantId) {
    // Invalid slug - redirect to builder home
    redirect('/admin/menu/builder')
  }
  
  // Redirect to menu builder with restaurant pre-selected
  redirect(`/admin/menu/builder?restaurant=${restaurantId}`)
}
