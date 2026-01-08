/**
 * Subdomain to Restaurant Mapping
 * 
 * Maps custom subdomains to restaurant slugs.
 * Format: subdomain (without .menu.ca) → restaurant slug
 * 
 * Example: orchidsushiottawa → orchid-sushi-245
 * 
 * When adding a new restaurant subdomain:
 * 1. Add the mapping here
 * 2. Add the subdomain as custom domain in Replit (e.g., orchidsushiottawa.menu.ca)
 * 3. Update DNS A record to point to Replit's IP
 */

export interface SubdomainMapping {
  subdomain: string;
  slug: string;
  restaurantId: number;
  name: string;
}

// Subdomain mappings - add new restaurants here
export const SUBDOMAIN_MAPPINGS: SubdomainMapping[] = [
  // First production restaurant
  {
    subdomain: 'orchidsushiottawa',
    slug: 'orchid-sushi-245',
    restaurantId: 245,
    name: 'Orchid Sushi Ottawa',
  },
  // Add more restaurants as they go live on v3
  // {
  //   subdomain: 'capitalbites',
  //   slug: 'capital-bites-973',
  //   restaurantId: 973,
  //   name: 'Capital Bites',
  // },
];

// Known development/preview hostnames to ignore
const DEV_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '.replit.dev',
  '.repl.co',
  '.replit.app', // Main replit app domain (orders.menu.ca is the custom domain)
];

/**
 * Check if hostname is a development/preview environment
 */
export function isDevHostname(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();
  return DEV_HOSTNAMES.some(dev => 
    lowerHost === dev || lowerHost.endsWith(dev)
  );
}

/**
 * Extract subdomain from hostname
 * Example: orchidsushiottawa.menu.ca → orchidsushiottawa
 * Returns null for non-subdomain hostnames
 */
export function extractSubdomain(hostname: string): string | null {
  // Strip port if present (e.g., orchidsushiottawa.menu.ca:5000)
  const lowerHost = hostname.toLowerCase().split(':')[0];
  
  // Skip dev hostnames
  if (isDevHostname(lowerHost)) {
    return null;
  }
  
  // Check for .menu.ca suffix
  if (!lowerHost.endsWith('.menu.ca')) {
    return null;
  }
  
  // Extract subdomain (part before .menu.ca)
  const subdomain = lowerHost.replace('.menu.ca', '');
  
  // Skip the main app subdomain (orders.menu.ca uses path-based routing)
  if (subdomain === 'orders' || subdomain === 'www' || subdomain === 'menu') {
    return null;
  }
  
  return subdomain;
}

/**
 * Look up restaurant by subdomain
 */
export function getRestaurantBySubdomain(subdomain: string): SubdomainMapping | null {
  const lowerSubdomain = subdomain.toLowerCase();
  return SUBDOMAIN_MAPPINGS.find(m => m.subdomain.toLowerCase() === lowerSubdomain) || null;
}

/**
 * Get restaurant slug from hostname
 * Returns null if hostname doesn't match any mapped subdomain
 */
export function getSlugFromHostname(hostname: string): string | null {
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) {
    return null;
  }
  
  const mapping = getRestaurantBySubdomain(subdomain);
  return mapping?.slug || null;
}
