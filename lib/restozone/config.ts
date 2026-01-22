/**
 * RestoZone Delivery Integration Configuration
 * 
 * Maps Menu.ca V3 restaurant IDs to RestoZone's restaurant IDs (Legacy V1 IDs).
 * Used for 3rd-party delivery dispatch to Quebec restaurants.
 */

export interface RestoZoneRestaurant {
  v3Id: number;
  restozoneId: number;  // Legacy V1 ID used by RestoZone API
  name: string;
}

// The 8 restaurants that use RestoZone delivery dispatch
export const RESTOZONE_RESTAURANTS: RestoZoneRestaurant[] = [
  { v3Id: 131, restozoneId: 255, name: 'Centertown Donair & Pizza' },
  { v3Id: 87, restozoneId: 203, name: 'Champa Thai Cuisine' },
  { v3Id: 943, restozoneId: 323, name: 'Charm Thai Cuisine' },
  { v3Id: 1010, restozoneId: 219, name: 'Lemongrass Thai Cuisine' },
  { v3Id: 15, restozoneId: 101, name: 'New Mee Fung Restaurant' },
  { v3Id: 807, restozoneId: 1051, name: 'Oh My Grill' },
  { v3Id: 199, restozoneId: 337, name: 'Pho Bo Ga King - Somerset' },
  { v3Id: 847, restozoneId: 1094, name: 'Sushiyana' },
];

// Set of V3 IDs for quick lookup
export const RESTOZONE_V3_IDS = new Set(RESTOZONE_RESTAURANTS.map(r => r.v3Id));

// Map from V3 ID to RestoZone ID
export const V3_TO_RESTOZONE_MAP = new Map(
  RESTOZONE_RESTAURANTS.map(r => [r.v3Id, r.restozoneId])
);

/**
 * Check if a restaurant uses RestoZone delivery dispatch
 */
export function usesRestozoneDispatch(restaurantV3Id: number): boolean {
  return RESTOZONE_V3_IDS.has(restaurantV3Id);
}

/**
 * Get the RestoZone ID for a restaurant (Legacy V1 ID)
 */
export function getRestozoneId(restaurantV3Id: number): number | null {
  return V3_TO_RESTOZONE_MAP.get(restaurantV3Id) ?? null;
}

// Backup emails for when RestoZone API fails
export const RESTOZONE_BACKUP_EMAILS = [
  'Deliveryzonecanada@gmail.com',
  'mattmenuottawa2@gmail.com', 
  'restozonedispatch@gmail.com',
];

// RestoZone API endpoints
export const RESTOZONE_API = {
  getFees: 'https://restozone.ca/deliveryzone/api/fraislivraison',
  dispatchDriver: 'https://restozone.ca/api3rdparty/request_delivery/65e974f303d394c72942364d06840e09',
};
