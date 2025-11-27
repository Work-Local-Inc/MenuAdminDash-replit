import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateCampaignSchema } from '@/lib/validations/promotions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/promotions/campaigns/:id
 * Get a single campaign with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: campaign, error } = await supabase
      .from('promotion_campaigns')
      .select(`
        *,
        promotion_codes(id, code, code_type, usage_count, usage_limit, is_active, expires_at),
        promotion_targets(id, target_type, course_id, dish_id, tag_name, is_qualifying_item),
        promotion_tiers(id, tier_order, threshold_amount, discount_type, discount_value, free_item_dish_id, description)
      `)
      .eq('id', campaignId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching campaign:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign', details: error.message },
        { status: 500 }
      );
    }

    // Fetch redemption stats
    const { data: redemptions } = await supabase
      .from('promotion_redemptions')
      .select('discount_amount, order_total, redeemed_at')
      .eq('campaign_id', campaignId);

    const stats = {
      redemptions: redemptions?.length || 0,
      revenue: redemptions?.reduce((sum, r) => sum + parseFloat(r.order_total || '0'), 0) || 0,
      total_discount: redemptions?.reduce((sum, r) => sum + parseFloat(r.discount_amount || '0'), 0) || 0,
    };

    return NextResponse.json({
      campaign: {
        ...campaign,
        stats,
      },
    });
  } catch (error) {
    console.error('Campaign GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/promotions/campaigns/:id
 * Update a campaign
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    
    // Validate input
    const input = UpdateCampaignSchema.parse(body);
    
    // Extract nested data
    const { targets, tiers, code, ...campaignData } = input;

    // Update campaign
    const { data: campaign, error: updateError } = await supabase
      .from('promotion_campaigns')
      .update({
        ...campaignData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .is('deleted_at', null)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      console.error('Error updating campaign:', updateError);
      return NextResponse.json(
        { error: 'Failed to update campaign', details: updateError.message },
        { status: 500 }
      );
    }

    // Update targets if provided
    if (targets !== undefined) {
      // Delete existing targets
      await supabase
        .from('promotion_targets')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new targets
      if (targets.length > 0) {
        const targetRecords = targets.map(t => ({
          campaign_id: campaignId,
          target_type: t.target_type,
          course_id: t.course_id || null,
          dish_id: t.dish_id || null,
          tag_name: t.tag_name || null,
          is_qualifying_item: t.is_qualifying_item ?? true,
        }));

        await supabase
          .from('promotion_targets')
          .insert(targetRecords);
      }
    }

    // Update tiers if provided
    if (tiers !== undefined) {
      // Delete existing tiers
      await supabase
        .from('promotion_tiers')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new tiers
      if (tiers.length > 0) {
        const tierRecords = tiers.map(t => ({
          campaign_id: campaignId,
          tier_order: t.tier_order,
          threshold_amount: t.threshold_amount,
          discount_type: t.discount_type,
          discount_value: t.discount_value || null,
          free_item_dish_id: t.free_item_dish_id || null,
          description: t.description || null,
        }));

        await supabase
          .from('promotion_tiers')
          .insert(tierRecords);
      }
    }

    // Update code if provided
    if (code !== undefined && campaign.campaign_type === 'coupon') {
      // Check if code exists
      const { data: existingCode } = await supabase
        .from('promotion_codes')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('code_type', 'standard')
        .single();

      if (existingCode) {
        await supabase
          .from('promotion_codes')
          .update({ code: code.toUpperCase() })
          .eq('id', existingCode.id);
      } else {
        await supabase
          .from('promotion_codes')
          .insert({
            campaign_id: campaignId,
            code: code.toUpperCase(),
            code_type: 'standard',
          });
      }
    }

    // Fetch updated campaign with relations
    const { data: updatedCampaign } = await supabase
      .from('promotion_campaigns')
      .select(`
        *,
        promotion_codes(id, code, usage_count, usage_limit, is_active),
        promotion_targets(id, target_type, course_id, dish_id),
        promotion_tiers(id, tier_order, threshold_amount, discount_type, discount_value)
      `)
      .eq('id', campaignId)
      .single();

    return NextResponse.json({ campaign: updatedCampaign || campaign });
  } catch (error) {
    console.error('Campaign PATCH error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request body', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promotions/campaigns/:id
 * Soft delete a campaign
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Soft delete
    const { error } = await supabase
      .from('promotion_campaigns')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'archived',
      })
      .eq('id', campaignId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json(
        { error: 'Failed to delete campaign', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Campaign DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

