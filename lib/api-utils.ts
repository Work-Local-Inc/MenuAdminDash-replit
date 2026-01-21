/**
 * Get the API base URL for making fetch requests.
 * 
 * When on a branded subdomain (e.g., centertowndonair.menu.ca),
 * this returns the main domain URL so API calls work correctly.
 * 
 * On the main domain or dev environment, returns empty string for relative URLs.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  
  const hostname = window.location.hostname
  
  // Check if we're on a branded subdomain (not orders.menu.ca, not localhost, not replit dev)
  const isSubdomain = hostname.endsWith('.menu.ca') && 
                      !hostname.startsWith('orders.') &&
                      hostname !== 'menu.ca'
  
  if (isSubdomain) {
    // On branded subdomain - use main domain for API calls
    return 'https://orders.menu.ca'
  }
  
  // On main domain or dev - use relative URLs
  return ''
}
