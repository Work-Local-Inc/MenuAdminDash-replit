/**
 * Get the API base URL for making fetch requests.
 * 
 * Since branded subdomains (e.g., centertowndonair.menu.ca) are properly
 * configured in Replit to point to the same app, relative URLs work correctly.
 * 
 * This function now always returns empty string for relative URLs,
 * avoiding CORS issues from cross-origin requests.
 */
export function getApiBaseUrl(): string {
  // Always use relative URLs - subdomains are configured to same app
  return ''
}
