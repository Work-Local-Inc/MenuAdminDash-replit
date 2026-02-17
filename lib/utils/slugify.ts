/**
 * Generate URL-friendly slug from text
 * Example: "Joe's Pizza Place" → "joes-pizza-place"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[']/g, '') // Remove apostrophes
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Extract restaurant ID from slug
 * Supports formats: "pizza-place-123" or just "123"
 */
export function extractIdFromSlug(slug: string): number | null {
  // Try to extract ID from slug (e.g., "pizza-place-123" → 123)
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  const id = parseInt(lastPart, 10);
  
  if (!isNaN(id)) {
    return id;
  }
  
  // If slug is just a number, use it directly
  const directId = parseInt(slug, 10);
  if (!isNaN(directId)) {
    return directId;
  }
  
  return null;
}

/**
 * Generate slug with ID for uniqueness
 * Example: (123, "Joe's Pizza") → "joes-pizza-123"
 */
export function createRestaurantSlug(id: number, name: string): string {
  const nameSlug = slugify(name);
  return `${nameSlug}-${id}`;
}
