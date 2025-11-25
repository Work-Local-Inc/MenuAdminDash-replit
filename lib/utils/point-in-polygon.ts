/**
 * Ray-casting algorithm to check if a point is inside a polygon ring.
 * @param point - [longitude, latitude] tuple
 * @param ring - Array of [longitude, latitude] coordinates forming a closed ring
 * @returns true if point is inside the ring
 */
export function isPointInRing(
  point: [number, number], 
  ring: number[][]
): boolean {
  if (!ring || ring.length < 3) return false
  
  const [x, y] = point
  let inside = false
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    
    const intersect = ((yi > y) !== (yj > y)) && 
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Check if a point is inside a GeoJSON Polygon (accounting for holes).
 * A point is inside if it's in the outer ring AND NOT in any hole.
 * @param point - [longitude, latitude] tuple
 * @param coordinates - Polygon coordinates array (first ring is outer, rest are holes)
 * @returns true if point is inside the polygon
 */
export function isPointInPolygon(
  point: [number, number],
  coordinates: number[][][]
): boolean {
  if (!coordinates || coordinates.length === 0) return false
  
  const outerRing = coordinates[0]
  if (!isPointInRing(point, outerRing)) {
    return false
  }
  
  for (let i = 1; i < coordinates.length; i++) {
    const hole = coordinates[i]
    if (isPointInRing(point, hole)) {
      return false
    }
  }
  
  return true
}

/**
 * Check if a point is inside a GeoJSON MultiPolygon.
 * A point is inside if it's inside ANY of the polygons.
 * @param point - [longitude, latitude] tuple
 * @param coordinates - MultiPolygon coordinates array
 * @returns true if point is inside any polygon
 */
export function isPointInMultiPolygon(
  point: [number, number],
  coordinates: number[][][][]
): boolean {
  if (!coordinates || coordinates.length === 0) return false
  
  for (const polygonCoords of coordinates) {
    if (isPointInPolygon(point, polygonCoords)) {
      return true
    }
  }
  
  return false
}

interface GeoJSONGeometry {
  type: string
  coordinates: any
}

/**
 * Check if a point is inside a GeoJSON geometry (Polygon or MultiPolygon).
 * @param point - [longitude, latitude] tuple
 * @param geometry - GeoJSON geometry object with type and coordinates
 * @returns true if point is inside the geometry
 */
export function isPointInGeoJSON(
  point: [number, number],
  geometry: GeoJSONGeometry | null
): boolean {
  if (!geometry || !geometry.coordinates) return false
  
  switch (geometry.type) {
    case 'Polygon':
      return isPointInPolygon(point, geometry.coordinates)
    case 'MultiPolygon':
      return isPointInMultiPolygon(point, geometry.coordinates)
    default:
      console.warn(`[Point-in-Polygon] Unsupported geometry type: ${geometry.type}`)
      return false
  }
}

/**
 * Find the first zone that contains the given point.
 * Supports both Polygon and MultiPolygon geometry types.
 * @param point - [longitude, latitude] tuple
 * @param zones - Array of zones with polygon property containing GeoJSON geometry
 * @returns The first matching zone or null
 */
export function findMatchingZone<T extends { polygon: GeoJSONGeometry | null }>(
  point: [number, number],
  zones: T[]
): T | null {
  for (const zone of zones) {
    if (!zone.polygon) continue
    
    if (isPointInGeoJSON(point, zone.polygon)) {
      return zone
    }
  }
  
  return null
}
