import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// API request helper for mutations
export async function apiRequest(url: string, options?: RequestInit) {
  // Detect FormData and let browser set Content-Type with multipart boundary
  const isFormData = options?.body instanceof FormData
  
  const response = await fetch(url, {
    ...options,
    headers: {
      // Only set JSON Content-Type for non-FormData requests
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}
