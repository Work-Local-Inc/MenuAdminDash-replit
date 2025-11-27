import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ValidateCodeSchema } from '@/lib/validations/promotions';

/**
 * POST /api/promotions/validate
 * Validate a promo code and calculate discount
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validate input
    const input = ValidateCodeSchema.parse(body);
    const { code, restaurant_id, cart, user_id, order_type } = input;

    // Find the code
    const { data: promoCode, error: codeError } = await supabase
      .from('promotion_codes')
      .select(`
        *,
        campaign:promotion_campaigns(
          *,
          promotion_targets(*),
          promotion_tiers(*)
        )
      `)
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (codeError || !promoCode) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'INVALID_CODE',
          message: 'This promo code is invalid or has expired',
        },
      });
    }

    const campaign = promoCode.campaign;

    // Check if campaign is active
    if (!campaign || campaign.status !== 'active' || campaign.deleted_at) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'CAMPAIGN_INACTIVE',
          message: 'This promotion is no longer active',
        },
      });
    }

    // Check restaurant
    if (campaign.restaurant_id !== restaurant_id) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'WRONG_RESTAURANT',
          message: 'This code is not valid for this restaurant',
        },
      });
    }

    // Check order type
    const orderTypeValid = 
      (order_type === 'delivery' && campaign.applies_to_delivery) ||
      (order_type === 'takeout' && campaign.applies_to_takeout) ||
      (order_type === 'dine_in' && campaign.applies_to_dine_in);

    if (!orderTypeValid) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'ORDER_TYPE_NOT_ALLOWED',
          message: `This code is not valid for ${order_type.replace('_', '-')} orders`,
        },
      });
    }

    // Check schedule
    const now = new Date();
    if (campaign.starts_at && new Date(campaign.starts_at) > now) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'NOT_STARTED',
          message: 'This promotion has not started yet',
        },
      });
    }
    if (campaign.ends_at && new Date(campaign.ends_at) < now) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'EXPIRED',
          message: 'This promotion has expired',
        },
      });
    }

    // Check code expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'CODE_EXPIRED',
          message: 'This code has expired',
        },
      });
    }

    // Check usage limits
    if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'CODE_USED_UP',
          message: 'This code has reached its usage limit',
        },
      });
    }

    if (campaign.total_usage_limit) {
      const { count: totalRedemptions } = await supabase
        .from('promotion_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);

      if (totalRedemptions && totalRedemptions >= campaign.total_usage_limit) {
        return NextResponse.json({
          valid: false,
          error: {
            code: 'CAMPAIGN_LIMIT_REACHED',
            message: 'This promotion has reached its limit',
          },
        });
      }
    }

    // Check per-customer limit
    if (user_id && campaign.per_customer_limit) {
      const { count: userRedemptions } = await supabase
        .from('promotion_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('user_id', user_id);

      if (userRedemptions && userRedemptions >= campaign.per_customer_limit) {
        return NextResponse.json({
          valid: false,
          error: {
            code: 'USER_LIMIT_REACHED',
            message: 'You have already used this promotion',
          },
        });
      }
    }

    // Check first order only
    if (campaign.trigger_type === 'first_order' && user_id) {
      const { count: previousOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('restaurant_id', restaurant_id)
        .eq('payment_status', 'succeeded');

      if (previousOrders && previousOrders > 0) {
        return NextResponse.json({
          valid: false,
          error: {
            code: 'NOT_FIRST_ORDER',
            message: 'This code is only valid for first-time customers',
          },
        });
      }
    }

    // Check minimum order value
    if (campaign.minimum_order_value && cart.subtotal < campaign.minimum_order_value) {
      const amountNeeded = campaign.minimum_order_value - cart.subtotal;
      return NextResponse.json({
        valid: false,
        error: {
          code: 'MIN_ORDER_NOT_MET',
          message: `Add $${amountNeeded.toFixed(2)} more to use this code`,
          details: {
            minimum_required: campaign.minimum_order_value,
            current_total: cart.subtotal,
          },
        },
      });
    }

    // Calculate discount based on type
    let discountAmount = 0;
    let discountDescription = '';

    switch (campaign.discount_type) {
      case 'percent_off':
        discountAmount = cart.subtotal * (campaign.discount_value / 100);
        if (campaign.discount_max_value && discountAmount > campaign.discount_max_value) {
          discountAmount = campaign.discount_max_value;
        }
        discountDescription = `${campaign.discount_value}% off`;
        break;

      case 'amount_off':
        discountAmount = Math.min(campaign.discount_value || 0, cart.subtotal);
        discountDescription = `$${campaign.discount_value} off`;
        break;

      case 'free_delivery':
        // This will be applied at checkout
        discountAmount = 0; // Delivery fee handled separately
        discountDescription = 'Free delivery';
        break;

      case 'tiered':
        // Find applicable tier
        const tiers = campaign.promotion_tiers || [];
        const sortedTiers = tiers.sort((a: any, b: any) => b.threshold_amount - a.threshold_amount);
        const applicableTier = sortedTiers.find((t: any) => cart.subtotal >= t.threshold_amount);
        
        if (applicableTier) {
          if (applicableTier.discount_type === 'percent_off') {
            discountAmount = cart.subtotal * (applicableTier.discount_value / 100);
          } else if (applicableTier.discount_type === 'amount_off') {
            discountAmount = applicableTier.discount_value;
          }
          discountDescription = applicableTier.description || `$${applicableTier.discount_value} off`;
        }
        break;

      default:
        discountAmount = 0;
    }

    // Apply maximum discount if set
    if (campaign.maximum_discount_amount && discountAmount > campaign.maximum_discount_amount) {
      discountAmount = campaign.maximum_discount_amount;
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return NextResponse.json({
      valid: true,
      discount: {
        type: campaign.discount_type,
        value: campaign.discount_value,
        amount: discountAmount,
        description: discountDescription,
      },
      campaign: {
        id: campaign.id,
        name: campaign.customer_display_name || campaign.name,
        description: campaign.customer_description,
        terms: campaign.terms_and_conditions,
      },
      code: {
        id: promoCode.id,
        code: promoCode.code,
      },
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          valid: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request data',
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { 
        valid: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Unable to validate code at this time',
        },
      },
      { status: 500 }
    );
  }
}

