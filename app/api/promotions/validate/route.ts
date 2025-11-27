import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/promotions/validate
 * Validate a promo code against promotional_coupons or promotional_deals
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { code, restaurant_slug, subtotal, order_type, user_id } = body;
    
    if (!code || !restaurant_slug) {
      return NextResponse.json(
        { error: 'Code and restaurant are required' },
        { status: 400 }
      );
    }

    // First, get restaurant_id from slug
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurant_slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const restaurant_id = restaurant.id;

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
      
      // Check usage limit
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
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
      
      // Calculate discount
      let discountValue = 0;
      let description = '';
      
      switch (coupon.discount_type) {
        case 'percent':
          discountValue = coupon.redeem_value_limit || 0;
          description = `${discountValue}% off your order`;
          break;
        case 'currency':
          discountValue = coupon.redeem_value_limit || 0;
          description = `$${discountValue} off your order`;
          break;
        case 'item':
          discountValue = 0; // Item value determined at checkout
          description = coupon.name || 'Free item';
          break;
        case 'delivery':
          discountValue = 0; // Delivery fee
          description = 'Free delivery';
          break;
        default:
          discountValue = coupon.redeem_value_limit || 0;
          description = coupon.name || 'Discount applied';
      }
      
      return NextResponse.json({
        valid: true,
        code: coupon.code,
        discount_type: coupon.discount_type,
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

