import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyDeviceAuth,
  isAuthError,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/tablet/verify-device';
import { getDeliveryProviderConfig, getDeliveryProviderAdapter } from '@/lib/delivery-providers';

/**
 * POST /api/tablet/orders/[id]/dispatch-driver
 *
 * Request a driver from an external delivery provider for a delivery order.
 * Only available for restaurants configured with a delivery provider.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Verify device authentication
    const authResult = await verifyDeviceAuth(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const deviceContext = authResult;

    // Check rate limit
    if (!checkRateLimit(deviceContext.device_id)) {
      return rateLimitResponse();
    }

    // Validate order ID
    const orderIdNum = parseInt(orderId, 10);
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const supabase = createAdminClient() as any;

    // Check if restaurant uses an external delivery provider
    const providerConfig = await getDeliveryProviderConfig(deviceContext.restaurant_id);
    
    if (!providerConfig?.provider || !providerConfig.provider.isActive || 
        !providerConfig.provider.supportsDispatchApi || !providerConfig.providerExternalId) {
      return NextResponse.json(
        { error: 'Restaurant not configured for external driver dispatch' },
        { status: 400 }
      );
    }

    const adapter = getDeliveryProviderAdapter(providerConfig.provider.code);
    if (!adapter) {
      return NextResponse.json(
        { error: `No adapter available for provider: ${providerConfig.provider.code}` },
        { status: 500 }
      );
    }

    // Get order details with restaurant info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_type,
        order_status,
        restaurant_id,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        postal_code,
        delivery_fee,
        tip_amount,
        total_amount,
        payment_method,
        special_instructions,
        estimated_ready_time,
        created_at
      `)
      .eq('id', orderIdNum)
      .eq('restaurant_id', deviceContext.restaurant_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify it's a delivery order
    if (order.order_type !== 'delivery') {
      return NextResponse.json(
        { error: 'Driver dispatch only available for delivery orders' },
        { status: 400 }
      );
    }

    // Verify order is in appropriate status (confirmed or preparing)
    const validStatuses = ['confirmed', 'preparing', 'ready'];
    if (!validStatuses.includes(order.order_status)) {
      return NextResponse.json(
        { 
          error: `Cannot dispatch driver for order in '${order.order_status}' status`,
          allowed_statuses: validStatuses
        },
        { status: 400 }
      );
    }

    // Default distance - can be overridden in request body
    let distanceKm = 5;

    // Get postal code from order or parse from address
    let postalCode = order.postal_code || '';
    if (!postalCode && order.delivery_address) {
      const postalMatch = order.delivery_address.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
      if (postalMatch) {
        postalCode = postalMatch[0].toUpperCase().replace(/\s/g, '');
      }
    }

    // Format prep time (use estimated_ready_time or calculate from order time)
    let prepTime = '';
    if (order.estimated_ready_time) {
      const readyDate = new Date(order.estimated_ready_time);
      prepTime = readyDate.toLocaleTimeString('en-CA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      // Default: 30 minutes from now
      const readyTime = new Date(Date.now() + 30 * 60 * 1000);
      prepTime = readyTime.toLocaleTimeString('en-CA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }

    // Request body can override some values
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    // Check for dry_run mode (test without actually calling provider API)
    const isDryRun = body.dry_run === true || request.nextUrl.searchParams.get('dry_run') === 'true';

    // Build dispatch payload
    const dispatchPayload = {
      restaurantId: deviceContext.restaurant_id,
      providerExternalId: providerConfig.providerExternalId,
      orderId: orderIdNum,
      address: order.delivery_address || '',
      postalCode: body.postalCode || postalCode,
      customerName: order.customer_name || 'Customer',
      customerPhone: order.customer_phone || '',
      customerEmail: order.customer_email || '',
      prepTime: body.prepTime || prepTime,
      deliveryFee: order.delivery_fee || 0,
      driverTip: order.tip_amount || 0,
      driverEarning: body.driverEarning || order.delivery_fee || 4,
      distanceKm: body.distanceKm || distanceKm,
      notes: order.special_instructions || '',
      paymentMethod: order.payment_method || 'card',
      total: order.total_amount || 0,
    };

    // DRY RUN MODE: Log payload and return without calling provider API
    if (isDryRun) {
      console.log(`[Tablet Dispatch Driver] DRY RUN - Order ${orderIdNum}:`, {
        provider: providerConfig.provider.code,
        payload: dispatchPayload,
      });

      return NextResponse.json({
        success: true,
        dry_run: true,
        order_id: orderIdNum,
        provider: providerConfig.provider.code,
        message: `DRY RUN: Would dispatch driver via ${providerConfig.provider.name} (no actual API call made)`,
        payload: dispatchPayload,
      });
    }

    // LIVE MODE: Dispatch driver via provider adapter
    const dispatchResult = await adapter.dispatch(dispatchPayload);

    // Record dispatch attempt in order status history
    const historyNotes = dispatchResult.usedBackupEmail
      ? `Driver dispatched via backup email (${providerConfig.provider.name} API unavailable)`
      : `Driver dispatched via ${providerConfig.provider.name} API`;

    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderIdNum,
        order_created_at: order.created_at,
        status: 'driver_requested',
        notes: historyNotes,
        changed_by_device_id: deviceContext.device_id,
      });

    console.log(
      `[Tablet Dispatch Driver] Order ${orderIdNum} via ${providerConfig.provider.name}: ${dispatchResult.success ? 'Success' : 'Failed'}`,
      dispatchResult.usedBackupEmail ? '(via backup email)' : ''
    );

    return NextResponse.json({
      success: dispatchResult.success,
      order_id: orderIdNum,
      provider: providerConfig.provider.code,
      used_backup_email: dispatchResult.usedBackupEmail || false,
      message: dispatchResult.usedBackupEmail
        ? `Driver request sent via backup email (${providerConfig.provider.name} API unavailable)`
        : `Driver request sent to ${providerConfig.provider.name}`,
    });
  } catch (error: any) {
    console.error('[Tablet Dispatch Driver] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch driver' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tablet/orders/[id]/dispatch-driver
 * 
 * Check if dispatch is available for this order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Verify device authentication
    const authResult = await verifyDeviceAuth(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const deviceContext = authResult;

    // Check if restaurant uses an external delivery provider
    const providerConfig = await getDeliveryProviderConfig(deviceContext.restaurant_id);
    
    const hasProvider = !!(providerConfig?.provider && 
                          providerConfig.provider.isActive && 
                          providerConfig.provider.supportsDispatchApi &&
                          providerConfig.providerExternalId);

    return NextResponse.json({
      dispatch_available: hasProvider,
      provider: hasProvider ? {
        code: providerConfig!.provider!.code,
        name: providerConfig!.provider!.name,
        external_id: providerConfig!.providerExternalId,
      } : null,
    });
  } catch (error: any) {
    console.error('[Tablet Dispatch Driver Check] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check dispatch status' },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
