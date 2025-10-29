"use client"

import { useQuery } from '@tanstack/react-query'

// ============================================
// GLOBAL CUISINES
// ============================================

export function useCuisines() {
  return useQuery({
    queryKey: ['/api/cuisines'],
    queryFn: async () => {
      const res = await fetch('/api/cuisines')
      if (!res.ok) throw new Error('Failed to fetch cuisines')
      return res.json()
    },
  })
}
