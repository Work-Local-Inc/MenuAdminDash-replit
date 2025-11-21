import { redirect } from 'next/navigation'

interface PageProps {
  params: {
    id: string
  }
}

export default function MenuBuilderDynamicPage({ params }: PageProps) {
  // Redirect to query param version for consistency
  redirect(`/admin/menu/builder?restaurant=${params.id}`)
}
