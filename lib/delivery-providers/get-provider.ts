/**
 * Get Delivery Provider Configuration for a Restaurant
 * 
 * Queries the database to get the delivery provider configuration
 * for a restaurant, including the provider details and external ID.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { RestaurantDeliveryConfig, DeliveryProvider } from './types';

interface ProviderQueryResult {
  restaurant_id: number;
  has_delivery_enabled: boolean;
  distance_based_delivery_fee: boolean;
  delivery_provider_external_id: string | null;
  delivery_providers: {
    id: number;
    code: string;
    name: string;
    api_base_url: string | null;
    is_active: boolean;
    supports_fee_api: boolean;
    supports_dispatch_api: boolean;
    supports_tracking: boolean;
  } | null;
}

/**
 * Get delivery provider configuration for a restaurant by ID
 */
export async function getDeliveryProviderConfig(
  restaurantId: number
): Promise<RestaurantDeliveryConfig | null> {
  const supabase = createAdminClient() as any;

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('delivery_and_pickup_configs')
    .select(`
      restaurant_id,
      has_delivery_enabled,
      distance_based_delivery_fee,
      delivery_provider_external_id,
      delivery_providers (
        id,
        code,
        name,
        api_base_url,
        is_active,
        supports_fee_api,
        supports_dispatch_api,
        supports_tracking
      )
    `)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error || !data) {
    console.error('[getDeliveryProviderConfig] Error:', error);
    return null;
  }

  const result = data as ProviderQueryResult;
  
  let provider: DeliveryProvider | null = null;
  
  if (result.delivery_providers) {
    provider = {
      id: result.delivery_providers.id,
      code: result.delivery_providers.code,
      name: result.delivery_providers.name,
      apiBaseUrl: result.delivery_providers.api_base_url,
      isActive: result.delivery_providers.is_active,
      supportsFeeApi: result.delivery_providers.supports_fee_api,
      supportsDispatchApi: result.delivery_providers.supports_dispatch_api,
      supportsTracking: result.delivery_providers.supports_tracking,
    };
  }

  return {
    restaurantId: result.restaurant_id,
    hasDeliveryEnabled: result.has_delivery_enabled,
    distanceBasedDeliveryFee: result.distance_based_delivery_fee,
    provider,
    providerExternalId: result.delivery_provider_external_id,
  };
}

/**
 * Check if a restaurant uses any external delivery provider
 */
export async function usesExternalDeliveryProvider(
  restaurantId: number
): Promise<boolean> {
  const config = await getDeliveryProviderConfig(restaurantId);
  return !!(config?.provider && config.provider.isActive && config.providerExternalId);
}

/**
 * Get all restaurants using a specific delivery provider
 */
export async function getRestaurantsByProvider(
  providerCode: string
): Promise<RestaurantDeliveryConfig[]> {
  const supabase = createAdminClient() as any;

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('delivery_and_pickup_configs')
    .select(`
      restaurant_id,
      has_delivery_enabled,
      distance_based_delivery_fee,
      delivery_provider_external_id,
      delivery_providers!inner (
        id,
        code,
        name,
        api_base_url,
        is_active,
        supports_fee_api,
        supports_dispatch_api,
        supports_tracking
      )
    `)
    .eq('delivery_providers.code', providerCode)
    .eq('delivery_providers.is_active', true);

  if (error || !data) {
    console.error('[getRestaurantsByProvider] Error:', error);
    return [];
  }

  return (data as ProviderQueryResult[]).map(result => ({
    restaurantId: result.restaurant_id,
    hasDeliveryEnabled: result.has_delivery_enabled,
    distanceBasedDeliveryFee: result.distance_based_delivery_fee,
    provider: result.delivery_providers ? {
      id: result.delivery_providers.id,
      code: result.delivery_providers.code,
      name: result.delivery_providers.name,
      apiBaseUrl: result.delivery_providers.api_base_url,
      isActive: result.delivery_providers.is_active,
      supportsFeeApi: result.delivery_providers.supports_fee_api,
      supportsDispatchApi: result.delivery_providers.supports_dispatch_api,
      supportsTracking: result.delivery_providers.supports_tracking,
    } : null,
    providerExternalId: result.delivery_provider_external_id,
  }));
}
