/**
 * Delivery Provider Types
 * 
 * Extensible system for integrating third-party delivery providers
 * (RestoZone, Tookan, DoorDash Drive, Uber Direct, etc.)
 */

export interface DeliveryProvider {
  id: number;
  code: string;  // 'restozone', 'tookan', etc.
  name: string;
  apiBaseUrl: string | null;
  isActive: boolean;
  supportsFeeApi: boolean;
  supportsDispatchApi: boolean;
  supportsTracking: boolean;
}

export interface RestaurantDeliveryConfig {
  restaurantId: number;
  hasDeliveryEnabled: boolean;
  distanceBasedDeliveryFee: boolean;
  provider: DeliveryProvider | null;
  providerExternalId: string | null;  // Restaurant's ID in provider's system
}

export interface DeliveryFeeRequest {
  restaurantId: number;
  providerExternalId: string;
  distanceKm: number;
}

export interface DeliveryFeeResponse {
  success: boolean;
  fee: number | null;
  error?: string;
  source?: 'provider_api' | 'fallback_table';
}

export interface DispatchRequest {
  restaurantId: number;
  providerExternalId: string;
  orderId: number;
  address: string;
  postalCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  prepTime: string;
  deliveryFee: number;
  driverTip: number;
  driverEarning: number;
  distanceKm: number;
  notes: string;
  paymentMethod: string;
  total: number;
}

export interface DispatchResponse {
  success: boolean;
  error?: string;
  usedBackupEmail?: boolean;
  trackingUrl?: string;
}

export interface DeliveryProviderAdapter {
  code: string;
  name: string;
  
  getFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse>;
  dispatch(request: DispatchRequest): Promise<DispatchResponse>;
}
