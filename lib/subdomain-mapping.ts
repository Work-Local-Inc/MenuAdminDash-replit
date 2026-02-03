/**
 * Subdomain to Restaurant Mapping
 * 
 * Supports both:
 * 1. Database lookups (preferred) - via Supabase RPC
 * 2. Static fallback - for development and initial deployment
 * 
 * Database table: menuca_v3.restaurant_subdomains
 * To add new subdomains without code changes:
 * INSERT INTO menuca_v3.restaurant_subdomains (restaurant_id, subdomain, slug, name)
 * VALUES (999, 'newrestaurant', 'new-restaurant-999', 'New Restaurant');
 */

export interface SubdomainMapping {
  subdomain: string;
  slug: string;
  restaurantId: number;
  name: string;
}

// ============================================
// STATIC FALLBACK MAPPINGS
// Used when database is unavailable or not yet migrated
// ============================================

export const STATIC_SUBDOMAIN_MAPPINGS: SubdomainMapping[] = [
  {
    subdomain: 'centertowndonair',
    slug: 'centertown-donair-pizza-131',
    restaurantId: 131,
    name: 'Centertown Donair & Pizza',
  },
  {
    subdomain: 'orchidsushiottawa',
    slug: 'orchid-sushi-245',
    restaurantId: 245,
    name: 'Orchid Sushi',
  },
  {
    subdomain: 'goldencenterpizza',
    slug: 'golden-center-pizza-815',
    restaurantId: 815,
    name: 'Golden Center Pizza',
  },
  {
    subdomain: 'bronson.papajoesottawa',
    slug: 'papa-joes-pizza-downtown-13',
    restaurantId: 13,
    name: "Papa Joe's Pizza - Downtown",
  },
];

// ============================================
// IN-MEMORY CACHE
// Caches database lookups to avoid hitting DB on every request
// ============================================

interface CacheEntry {
  data: SubdomainMapping[];
  timestamp: number;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Use globalThis to persist cache across hot reloads in development
declare global {
  var __subdomainCache: CacheEntry | undefined;
}

function getCache(): SubdomainMapping[] | null {
  const cache = globalThis.__subdomainCache;
  if (!cache) return null;
  
  const now = Date.now();
  if (now - cache.timestamp > CACHE_TTL) {
    // Cache expired
    return null;
  }
  
  return cache.data;
}

function setCache(data: SubdomainMapping[]): void {
  globalThis.__subdomainCache = {
    data,
    timestamp: Date.now(),
  };
}

// ============================================
// DATABASE LOOKUP
// Fetches subdomain mappings from Supabase
// ============================================

async function fetchMappingsFromDatabase(): Promise<SubdomainMapping[] | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[Subdomain] Missing Supabase credentials, using static fallback');
      return null;
    }
    
    console.log('[Subdomain] Fetching mappings from database...');
    
    // Call the RPC function to get all mappings
    // Note: Content-Profile header needed for menuca_v3 schema
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_all_subdomain_mappings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Profile': 'menuca_v3',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({}),
    });
    
    console.log('[Subdomain] RPC response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Subdomain] RPC error response:', errorText);
      // RPC function might not exist yet
      if (response.status === 404) {
        console.log('[Subdomain] RPC function not found, using static fallback');
        return null;
      }
      console.error('[Subdomain] Database fetch failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('[Subdomain] RPC response data:', JSON.stringify(data));
    
    if (!Array.isArray(data)) {
      console.log('[Subdomain] Invalid response format, using static fallback');
      return null;
    }
    
    // Transform to our format
    const mappings: SubdomainMapping[] = data.map((row: any) => ({
      subdomain: row.subdomain,
      slug: row.slug,
      restaurantId: row.restaurant_id,
      name: row.name || '',
    }));
    
    console.log(`[Subdomain] Loaded ${mappings.length} mappings from database:`, mappings.map(m => m.subdomain).join(', '));
    return mappings;
  } catch (error) {
    console.error('[Subdomain] Database fetch error:', error);
    return null;
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get all subdomain mappings (cached, with database fallback to static)
 */
export async function getAllMappings(): Promise<SubdomainMapping[]> {
  // Check cache first
  const cached = getCache();
  if (cached) {
    return cached;
  }
  
  // Try database
  const dbMappings = await fetchMappingsFromDatabase();
  if (dbMappings && dbMappings.length > 0) {
    setCache(dbMappings);
    return dbMappings;
  }
  
  // Fall back to static mappings
  setCache(STATIC_SUBDOMAIN_MAPPINGS);
  return STATIC_SUBDOMAIN_MAPPINGS;
}

/**
 * Get all subdomain mappings synchronously (uses cache or static fallback)
 * Use this in middleware where async might be tricky
 */
export function getAllMappingsSync(): SubdomainMapping[] {
  const cached = getCache();
  if (cached) {
    return cached;
  }
  return STATIC_SUBDOMAIN_MAPPINGS;
}

// Known development/preview hostnames to ignore
const DEV_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '.replit.dev',
  '.repl.co',
  '.replit.app',
];

/**
 * Check if hostname is a development/preview environment
 */
export function isDevHostname(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase().split(':')[0];
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
  // Strip port if present
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
 * Look up restaurant by subdomain (sync version for middleware)
 */
export function getRestaurantBySubdomain(subdomain: string): SubdomainMapping | null {
  const mappings = getAllMappingsSync();
  const lowerSubdomain = subdomain.toLowerCase();
  return mappings.find(m => m.subdomain.toLowerCase() === lowerSubdomain) || null;
}

/**
 * Look up restaurant by subdomain (async version with DB lookup)
 */
export async function getRestaurantBySubdomainAsync(subdomain: string): Promise<SubdomainMapping | null> {
  const mappings = await getAllMappings();
  const lowerSubdomain = subdomain.toLowerCase();
  return mappings.find(m => m.subdomain.toLowerCase() === lowerSubdomain) || null;
}

/**
 * Get restaurant slug from hostname (sync)
 */
export function getSlugFromHostname(hostname: string): string | null {
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) {
    return null;
  }
  
  const mapping = getRestaurantBySubdomain(subdomain);
  return mapping?.slug || null;
}

/**
 * Warm up the cache by fetching from database
 * Call this on app startup or via a cron endpoint
 */
export async function warmupCache(): Promise<void> {
  console.log('[Subdomain] Warming up cache...');
  await getAllMappings();
  console.log('[Subdomain] Cache warmed up');
}

/**
 * Invalidate cache (call after adding/updating subdomains)
 */
export function invalidateCache(): void {
  globalThis.__subdomainCache = undefined;
  console.log('[Subdomain] Cache invalidated');
}
