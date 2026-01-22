import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyDeviceAuth,
  isAuthError,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/tablet/verify-device';
import { usesRestozoneDispatch, getRestozoneId } from '@/lib/restozone/config';
import { dispatchRestozoneDriver } from '@/lib/restozone/service';

/**
 * POST /api/tablet/orders/[id]/dispatch-driver
 *
 * Request a driver from RestoZone for a delivery order.
 * Only available for the 8 restaurants configured to use RestoZone.
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

    // Check if restaurant uses RestoZone
    if (!usesRestozoneDispatch(deviceContext.restaurant_id)) {
      return NextResponse.json(
        { error: 'Restaurant not configured for RestoZone dispatch' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any;

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
        delivery_lat,
        delivery_lng,
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

    // Get restaurant location for distance calculation
    const { data: restaurant, error: restaurantError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_locations')
      .select('lat, lng, postal_code')
      .eq('restaurant_id', deviceContext.restaurant_id)
      .single();

    // Calculate distance if we have coordinates
    let distanceKm = 5; // Default fallback
    if (restaurant && order.delivery_lat && order.delivery_lng && restaurant.lat && restaurant.lng) {
      distanceKm = calculateDistance(
        restaurant.lat,
        restaurant.lng,
        order.delivery_lat,
        order.delivery_lng
      );
      // Round to nearest km
      distanceKm = Math.ceil(distanceKm);
    }

    // Parse postal code from address if not available
    let postalCode = '';
    if (order.delivery_address) {
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

    // Dispatch driver via RestoZone
    const dispatchResult = await dispatchRestozoneDriver({
      restaurantV3Id: deviceContext.restaurant_id,
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
    });

    // Record dispatch attempt in order status history
    const historyNotes = dispatchResult.usedBackupEmail
      ? `Driver dispatched via backup email (API unavailable)`
      : `Driver dispatched via RestoZone API`;

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
      `[Tablet Dispatch Driver] Order ${orderIdNum}: ${dispatchResult.success ? 'Success' : 'Failed'}`,
      dispatchResult.usedBackupEmail ? '(via backup email)' : ''
    );

    return NextResponse.json({
      success: dispatchResult.success,
      order_id: orderIdNum,
      used_backup_email: dispatchResult.usedBackupEmail || false,
      message: dispatchResult.usedBackupEmail
        ? 'Driver request sent via backup email (RestoZone API unavailable)'
        : 'Driver request sent to RestoZone',
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

    // Check if restaurant uses RestoZone
    const usesRestozone = usesRestozoneDispatch(deviceContext.restaurant_id);
    const restozoneId = getRestozoneId(deviceContext.restaurant_id);

    return NextResponse.json({
      uses_restozone: usesRestozone,
      restozone_id: restozoneId,
      dispatch_available: usesRestozone,
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
