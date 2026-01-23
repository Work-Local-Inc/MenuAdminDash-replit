/**
 * Delivery Provider Factory
 * 
 * Returns the appropriate adapter based on provider code.
 * Add new adapters here as they are implemented.
 */

import type { DeliveryProviderAdapter } from './types';
import { RestoZoneAdapter } from './adapters/restozone';

const adapters: Record<string, () => DeliveryProviderAdapter> = {
  restozone: () => new RestoZoneAdapter(),
  // Add new adapters here:
  // tookan: () => new TookanAdapter(),
  // doordash_drive: () => new DoorDashAdapter(),
  // uber_direct: () => new UberDirectAdapter(),
};

/**
 * Get the delivery provider adapter for a given provider code
 */
export function getDeliveryProviderAdapter(
  providerCode: string
): DeliveryProviderAdapter | null {
  const adapterFactory = adapters[providerCode.toLowerCase()];
  
  if (!adapterFactory) {
    console.warn(`[DeliveryProviderFactory] Unknown provider: ${providerCode}`);
    return null;
  }
  
  return adapterFactory();
}

/**
 * Check if an adapter exists for a provider code
 */
export function hasAdapterForProvider(providerCode: string): boolean {
  return providerCode.toLowerCase() in adapters;
}

/**
 * Get list of supported provider codes
 */
export function getSupportedProviders(): string[] {
  return Object.keys(adapters);
}
