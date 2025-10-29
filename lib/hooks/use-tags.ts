"use client"

import { useQuery } from '@tanstack/react-query'

// ============================================
// GLOBAL TAGS
// ============================================

export function useTags() {
  return useQuery({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Failed to fetch tags')
      return res.json()
    },
  })
}
