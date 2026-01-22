/**
 * RestoZone Delivery Integration Service
 * 
 * Handles:
 * 1. getFees() - Get delivery fee based on distance (for checkout)
 * 2. dispatchDriver() - Request driver after order accepted (for tablet)
 * 3. Backup email fallback when API fails
 */

import { RESTOZONE_API, RESTOZONE_BACKUP_EMAILS, getRestozoneId } from './config';

export interface RestozoneFeesRequest {
  restaurantV3Id: number;
  distanceKm: number;
}

export interface RestozoneFeesResponse {
  success: boolean;
  fee: number | null;
  error?: string;
  usedFallback?: boolean;
}

export interface RestozoneDispatchRequest {
  restaurantV3Id: number;
  orderId: number;
  address: string;
  postalCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  prepTime: string;  // Format: 'HH:mm' or timestamp
  deliveryFee: number;
  driverTip: number;
  driverEarning: number;
  distanceKm: number;
  notes: string;
  paymentMethod: string;
  total: number;
}

export interface RestozoneDispatchResponse {
  success: boolean;
  error?: string;
  usedBackupEmail?: boolean;
}

/**
 * Get delivery fee from RestoZone API based on distance
 * Returns null if API fails (caller should use fallback fee)
 */
export async function getRestozoneDeliveryFee(
  request: RestozoneFeesRequest
): Promise<RestozoneFeesResponse> {
  const restozoneId = getRestozoneId(request.restaurantV3Id);
  
  if (!restozoneId) {
    return {
      success: false,
      fee: null,
      error: 'Restaurant not configured for RestoZone',
    };
  }

  try {
    const response = await fetch(RESTOZONE_API.getFees, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify({
        idresto: restozoneId,
        distance: request.distanceKm,
      }),
    });

    const result = await response.json();
    
    console.log(`[RestoZone getFees] Restaurant ${request.restaurantV3Id} (RestoZone ID: ${restozoneId}), Distance: ${request.distanceKm}km, Response:`, result);

    if (result && typeof result.frais !== 'undefined') {
      return {
        success: true,
        fee: parseFloat(result.frais),
      };
    } else {
      return {
        success: false,
        fee: null,
        error: 'Invalid response from RestoZone API',
      };
    }
  } catch (error: any) {
    console.error('[RestoZone getFees] API call failed:', error.message);
    return {
      success: false,
      fee: null,
      error: error.message || 'Failed to connect to RestoZone',
    };
  }
}

// Map Menu.ca payment methods to RestoZone expected values
const PAYMENT_METHOD_MAP: Record<string, string> = {
  'card': 'card',
  'credit_card': 'card',
  'debit': 'debit',
  'cash': 'cash',
  'interac': 'interac',
  'card_at_door': 'card',
  // Default fallback
  'default': 'card',
};

function mapPaymentMethod(method: string): string {
  const normalizedMethod = (method || '').toLowerCase().trim();
  return PAYMENT_METHOD_MAP[normalizedMethod] || PAYMENT_METHOD_MAP['default'];
}

/**
 * Request driver dispatch from RestoZone API
 * Falls back to backup email if API fails
 */
export async function dispatchRestozoneDriver(
  request: RestozoneDispatchRequest
): Promise<RestozoneDispatchResponse> {
  const restozoneId = getRestozoneId(request.restaurantV3Id);
  
  if (!restozoneId) {
    return {
      success: false,
      error: 'Restaurant not configured for RestoZone',
    };
  }

  // Format phone number (remove formatting)
  const phone = request.customerPhone.replace(/\D/g, '');
  
  // Format postal code (remove dash)
  const postalCode = request.postalCode.replace('-', '');
  
  // Map payment method to RestoZone expected format
  const mappedPaymentMethod = mapPaymentMethod(request.paymentMethod);

  const payload = {
    idresto: restozoneId,
    adresse: request.address,
    codepostal: postalCode,
    nomclient: request.customerName,
    telclient: phone,
    emailclient: request.customerEmail,
    preptime: request.prepTime,
    frais: request.deliveryFee,
    tip: request.driverTip || 0,
    donnerlivreur: request.driverEarning || 4,
    distance: request.distanceKm,
    note: request.notes,
    type_paiement1: mappedPaymentMethod,
    total: request.total,
  };

  console.log(`[RestoZone dispatchDriver] Order ${request.orderId} for restaurant ${request.restaurantV3Id}:`, payload);

  try {
    const response = await fetch(RESTOZONE_API.dispatchDriver, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    console.log(`[RestoZone dispatchDriver] Order ${request.orderId} response:`, result);

    if (result && result.success === true) {
      return {
        success: true,
        usedBackupEmail: false,
      };
    } else {
      // API returned but with failure - send backup email
      console.warn(`[RestoZone dispatchDriver] API returned failure for order ${request.orderId}, sending backup email`);
      await sendBackupEmail(request, payload, 'API returned failure response');
      return {
        success: true, // We consider it success if backup email was sent
        usedBackupEmail: true,
      };
    }
  } catch (error: any) {
    console.error(`[RestoZone dispatchDriver] API call failed for order ${request.orderId}:`, error.message);
    
    // API failed - send backup email
    await sendBackupEmail(request, payload, error.message);
    
    return {
      success: true, // We consider it success if backup email was sent
      usedBackupEmail: true,
    };
  }
}

/**
 * Send backup email to dispatch operators when API fails
 */
async function sendBackupEmail(
  request: RestozoneDispatchRequest,
  payload: Record<string, any>,
  errorReason: string
): Promise<void> {
  const emailContent = `
RestoZone Driver Request - BACKUP EMAIL
========================================
Order ID: ${request.orderId}
Restaurant: ${request.restaurantV3Id}
Error: ${errorReason}

CUSTOMER DETAILS
----------------
Name: ${request.customerName}
Phone: ${request.customerPhone}
Email: ${request.customerEmail}
Address: ${request.address}
Postal Code: ${request.postalCode}

ORDER DETAILS
-------------
Total: $${request.total.toFixed(2)}
Delivery Fee: $${request.deliveryFee.toFixed(2)}
Driver Tip: $${(request.driverTip || 0).toFixed(2)}
Payment Method: ${request.paymentMethod}

DELIVERY INFO
-------------
Distance: ${request.distanceKm} km
Prep Time: ${request.prepTime}
Notes: ${request.notes || 'None'}

API PAYLOAD (for debugging)
---------------------------
${JSON.stringify(payload, null, 2)}
`.trim();

  console.log('[RestoZone Backup Email] Sending to:', RESTOZONE_BACKUP_EMAILS.join(', '));
  console.log('[RestoZone Backup Email] Content:', emailContent);

  // Try to send via Resend API if configured
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Menu.ca Orders <orders@menu.ca>',
          to: RESTOZONE_BACKUP_EMAILS,
          subject: `[BACKUP] Driver Request - Order #${request.orderId}`,
          text: emailContent,
        }),
      });

      if (response.ok) {
        console.log('[RestoZone Backup Email] Sent successfully via Resend');
      } else {
        const error = await response.text();
        console.error('[RestoZone Backup Email] Resend API failed:', error);
      }
    } else {
      console.warn('[RestoZone Backup Email] RESEND_API_KEY not configured, email logged but not sent');
    }
  } catch (error: any) {
    console.error('[RestoZone Backup Email] Failed to send:', error.message);
  }
}
