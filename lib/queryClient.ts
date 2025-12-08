import { QueryClient } from '@tanstack/react-query'

// Default query function for React Query
const defaultQueryFn = async ({ queryKey }: { queryKey: any[] }) => {
  // The query key should be a URL or array starting with a URL
  const url = Array.isArray(queryKey) ? queryKey.join('/') : queryKey
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
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
  
  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        // Only set JSON Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    })
  } catch (fetchError: any) {
    // Network error - request didn't complete
    console.error('[apiRequest] Fetch failed:', fetchError)
    throw new Error(`Network error: ${fetchError.message || 'Failed to fetch'}`)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}
