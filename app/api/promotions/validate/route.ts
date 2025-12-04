import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Extract restaurant ID from slug format: "restaurant-name-123"
 */
function extractIdFromSlug(slug: string): number | null {
  // Try to match ID at end of slug (format: restaurant-name-123)
  const match = slug.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  
  // Try pure numeric slug
  const numericMatch = slug.match(/^(\d+)$/);
  if (numericMatch) return parseInt(numericMatch[1], 10);
  
  return null;
}

/**
 * POST /api/promotions/validate
 * Validate a promo code against promotional_coupons or promotional_deals
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const body = await request.json();
    
    const { code, restaurant_slug, subtotal, order_type, user_id } = body;
    
    console.log('[Promo Validate] Request:', { code, restaurant_slug, subtotal, order_type });
    
    if (!code || !restaurant_slug) {
      return NextResponse.json(
        { error: 'Code and restaurant are required' },
        { status: 400 }
      );
    }

    // Extract restaurant ID from slug (format: restaurant-name-123)
    const restaurant_id = extractIdFromSlug(restaurant_slug);
    
    console.log('[Promo Validate] Extracted restaurant_id:', restaurant_id, 'from slug:', restaurant_slug);
    
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();

    console.log('[Promo Validate] Restaurant lookup:', { restaurant, restaurantError });

    if (restaurantError || !restaurant) {
      console.log('[Promo Validate] Restaurant not found for ID:', restaurant_id);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // =====================================================
    // Check promotional_coupons (legacy/main coupons table)
    // =====================================================
    const { data: coupon, error: couponError } = await supabase
      .from('promotional_coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('restaurant_id', restaurant_id)
      .is('deleted_at', null)
      .single();

    console.log('[Promo Validate] Coupon lookup:', { 
      code: code.toUpperCase(), 
      restaurant_id, 
      coupon: coupon ? { id: coupon.id, code: coupon.code } : null, 
      couponError: couponError?.message 
    });

    if (coupon && !couponError) {
      // Found a coupon! Validate it
      const now = new Date();
      
      // Check valid_from_at
      if (coupon.valid_from_at && new Date(coupon.valid_from_at) > now) {
        return NextResponse.json(
          { error: 'This promo code is not yet active' },
          { status: 400 }
        );
      }
      
      // Check valid_until_at
      if (coupon.valid_until_at && new Date(coupon.valid_until_at) < now) {
        return NextResponse.json(
          { error: 'This promo code has expired' },
          { status: 400 }
        );
      }
      
      // Check if coupon is active
      if (coupon.is_active === false) {
        return NextResponse.json(
          { error: 'This promo code is no longer active' },
          { status: 400 }
        );
      }
      
      // Check usage limit - handle both old (usage_limit/usage_count) and new (max_redemptions/redemption_count) column names
      const usageLimit = coupon.max_redemptions ?? coupon.usage_limit;
      const usageCount = coupon.redemption_count ?? coupon.usage_count ?? 0;
      if (usageLimit !== null && usageLimit !== undefined && usageCount >= usageLimit) {
        return NextResponse.json(
          { error: 'This promo code has reached its usage limit' },
          { status: 400 }
        );
      }
      
      // Check minimum purchase
      if (coupon.minimum_purchase && subtotal < coupon.minimum_purchase) {
        const needed = (coupon.minimum_purchase - subtotal).toFixed(2);
        return NextResponse.json(
          { error: `Add $${needed} more to use this code (min. $${coupon.minimum_purchase})` },
          { status: 400 }
        );
      }
      
      // Check order type
      const availTypes = coupon.availability_types || [];
      const orderTypeOk = availTypes.length === 0 || 
        (order_type === 'delivery' && (availTypes.includes('delivery') || availTypes.includes('all'))) ||
        (order_type === 'pickup' && (availTypes.includes('takeout') || availTypes.includes('pickup') || availTypes.includes('all')));
      
      if (availTypes.length > 0 && !orderTypeOk) {
        return NextResponse.json(
          { error: `This code is not valid for ${order_type} orders` },
          { status: 400 }
        );
      }
      
      // Check first order only
      if (coupon.is_first_order_only && user_id) {
        const { count: previousOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('restaurant_id', restaurant_id)
          .eq('payment_status', 'succeeded');

        if (previousOrders && previousOrders > 0) {
          return NextResponse.json(
            { error: 'This code is only valid for first-time customers' },
            { status: 400 }
          );
        }
      }
      
      // Calculate discount - handle both old and new column names
      // Old: redeem_value_limit, percent/currency
      // New: discount_amount, percentage/fixed
      let discountValue = 0;
      let description = '';
      let discountType = coupon.discount_type;
      
      // Normalize discount type names
      if (discountType === 'percent' || discountType === 'percentage') {
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = `${discountValue}% off your order`;
        discountType = 'percent'; // Normalize for frontend
      } else if (discountType === 'currency' || discountType === 'fixed') {
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = `$${discountValue} off your order`;
        discountType = 'currency'; // Normalize for frontend
      } else if (discountType === 'item') {
        discountValue = 0; // Item value determined at checkout
        description = coupon.name || 'Free item';
      } else if (discountType === 'delivery') {
        discountValue = 0; // Delivery fee
        description = 'Free delivery';
      } else {
        // Fallback - try to get value from either column
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = coupon.name || 'Discount applied';
      }
      
      return NextResponse.json({
        valid: true,
        code: coupon.code,
        discount_type: discountType, // Use normalized type
        discount_value: discountValue,
        description: description,
        promo_id: coupon.id,
        promo_type: 'coupon',
        name: coupon.name,
      });
    }

    // =====================================================
    // Check promotional_deals for promo_code match
    // =====================================================
    const { data: deal, error: dealError } = await supabase
      .from('promotional_deals')
      .select('*')
      .eq('promo_code', code.toUpperCase())
      .eq('restaurant_id', restaurant_id)
      .eq('is_enabled', true)
      .single();

    if (deal && !dealError) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check date range
      if (deal.date_start && deal.date_start > today) {
        return NextResponse.json(
          { error: 'This promo code is not yet active' },
          { status: 400 }
        );
      }
      
      if (deal.date_stop && deal.date_stop < today) {
        return NextResponse.json(
          { error: 'This promo code has expired' },
          { status: 400 }
        );
      }
      
      // Check minimum purchase
      if (deal.minimum_purchase && subtotal < deal.minimum_purchase) {
        const needed = (deal.minimum_purchase - subtotal).toFixed(2);
        return NextResponse.json(
          { error: `Add $${needed} more to use this code (min. $${deal.minimum_purchase})` },
          { status: 400 }
        );
      }
      
      // Calculate discount
      let discountType: 'percent' | 'currency' | 'item' | 'delivery' = 'percent';
      let discountValue = 0;
      let description = deal.name || 'Special deal';
      
      if (deal.deal_type === 'percent' || deal.deal_type === 'percentTotal') {
        discountType = 'percent';
        discountValue = deal.discount_percent || 0;
        description = `${discountValue}% off your order`;
      } else if (deal.deal_type === 'value' || deal.deal_type === 'valueTotal') {
        discountType = 'currency';
        discountValue = deal.discount_amount || 0;
        description = `$${discountValue} off your order`;
      } else if (deal.deal_type === 'freeItem') {
        discountType = 'item';
        discountValue = 0;
        description = deal.name || 'Free item included';
      }
      
      return NextResponse.json({
        valid: true,
        code: deal.promo_code,
        discount_type: discountType,
        discount_value: discountValue,
        description: description,
        promo_id: deal.id,
        promo_type: 'deal',
        name: deal.name,
      });
    }

    // No match found
    return NextResponse.json(
      { error: 'Invalid promo code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[POST /api/promotions/validate] Error:', error);
    return NextResponse.json(
      { error: 'Unable to validate code at this time' },
      { status: 500 }
    );
  }
}

