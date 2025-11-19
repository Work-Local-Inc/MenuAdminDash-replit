"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// DOMAIN MONITORING & VERIFICATION
// ============================================

export function useDomainsSummary() {
  return useQuery({
    queryKey: ['/api/domains/summary'],
    queryFn: async () => {
      const res = await fetch('/api/domains/summary')
      if (!res.ok) throw new Error('Failed to fetch domains summary')
      return res.json()
    },
  })
}

export function useDomainsNeedingAttention() {
  return useQuery({
    queryKey: ['/api/domains/needing-attention'],
    queryFn: async () => {
      const res = await fetch('/api/domains/needing-attention')
      if (!res.ok) throw new Error('Failed to fetch domains needing attention')
      return res.json()
    },
  })
}

export function useDomainStatus(domainId: string) {
  return useQuery({
    queryKey: ['/api/domains', domainId, 'status'],
    queryFn: async () => {
      const res = await fetch(`/api/domains/${domainId}/status`)
      if (!res.ok) throw new Error('Failed to fetch domain status')
      return res.json()
    },
    enabled: !!domainId,
  })
}

export function useVerifyDomain() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to verify domain')
      }
      return res.json()
    },
    onSuccess: (_, domainId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains', domainId, 'status'] })
      queryClient.invalidateQueries({ queryKey: ['/api/domains/summary'] })
      queryClient.invalidateQueries({ queryKey: ['/api/domains/needing-attention'] })
      toast({
        title: "Success",
        description: "Domain verification initiated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}
