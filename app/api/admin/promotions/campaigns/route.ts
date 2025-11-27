import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  CreateCampaignSchema, 
  CampaignFiltersSchema,
  type CreateCampaignInput 
} from '@/lib/validations/promotions';

/**
 * GET /api/admin/promotions/campaigns
 * List campaigns with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const filters = CampaignFiltersSchema.parse({
      restaurant_id: searchParams.get('restaurant_id'),
      status: searchParams.get('status') || undefined,
      campaign_type: searchParams.get('campaign_type') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || 50,
      offset: searchParams.get('offset') || 0,
    });

    // Build query
    let query = supabase
      .from('promotion_campaigns')
      .select(`
        *,
        promotion_codes(id, code, usage_count, usage_limit, is_active),
        promotion_targets(id, target_type, course_id, dish_id),
        promotion_tiers(id, tier_order, threshold_amount, discount_type, discount_value)
      `, { count: 'exact' })
      .eq('restaurant_id', filters.restaurant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.campaign_type) {
      query = query.eq('campaign_type', filters.campaign_type);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,internal_name.ilike.%${filters.search}%`);
    }

    const { data: campaigns, error, count } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: error.message },
        { status: 500 }
      );
    }

    // Fetch redemption stats for each campaign
    const campaignIds = campaigns?.map(c => c.id) || [];
    
    let stats: Record<number, { redemptions: number; revenue: number }> = {};
    
    if (campaignIds.length > 0) {
      const { data: redemptionStats } = await supabase
        .from('promotion_redemptions')
        .select('campaign_id, discount_amount, order_total')
        .in('campaign_id', campaignIds);

      if (redemptionStats) {
        stats = redemptionStats.reduce((acc, r) => {
          if (!acc[r.campaign_id]) {
            acc[r.campaign_id] = { redemptions: 0, revenue: 0 };
          }
          acc[r.campaign_id].redemptions += 1;
          acc[r.campaign_id].revenue += parseFloat(r.order_total || '0');
          return acc;
        }, {} as Record<number, { redemptions: number; revenue: number }>);
      }
    }

    // Enrich campaigns with stats
    const enrichedCampaigns = campaigns?.map(campaign => ({
      ...campaign,
      stats: stats[campaign.id] || { redemptions: 0, revenue: 0 },
    }));

    return NextResponse.json({
      campaigns: enrichedCampaigns,
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error) {
    console.error('Campaigns GET error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error },
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
 * POST /api/admin/promotions/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validate input
    const input = CreateCampaignSchema.parse(body);
    
    // Extract nested data
    const { targets, tiers, code, ...campaignData } = input;

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('promotion_campaigns')
      .insert({
        ...campaignData,
        recurring_schedule: campaignData.recurring_schedule || null,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json(
        { error: 'Failed to create campaign', details: campaignError.message },
        { status: 500 }
      );
    }

    // Create coupon code if provided (for coupon type)
    if (code && campaign.campaign_type === 'coupon') {
      const { error: codeError } = await supabase
        .from('promotion_codes')
        .insert({
          campaign_id: campaign.id,
          code: code.toUpperCase(),
          code_type: 'standard',
        });

      if (codeError) {
        console.error('Error creating code:', codeError);
        // Don't fail the whole request, just log
      }
    }

    // Create targets if provided
    if (targets && targets.length > 0) {
      const targetRecords = targets.map(t => ({
        campaign_id: campaign.id,
        target_type: t.target_type,
        course_id: t.course_id || null,
        dish_id: t.dish_id || null,
        tag_name: t.tag_name || null,
        is_qualifying_item: t.is_qualifying_item ?? true,
      }));

      const { error: targetsError } = await supabase
        .from('promotion_targets')
        .insert(targetRecords);

      if (targetsError) {
        console.error('Error creating targets:', targetsError);
      }
    }

    // Create tiers if provided
    if (tiers && tiers.length > 0) {
      const tierRecords = tiers.map(t => ({
        campaign_id: campaign.id,
        tier_order: t.tier_order,
        threshold_amount: t.threshold_amount,
        discount_type: t.discount_type,
        discount_value: t.discount_value || null,
        free_item_dish_id: t.free_item_dish_id || null,
        description: t.description || null,
      }));

      const { error: tiersError } = await supabase
        .from('promotion_tiers')
        .insert(tierRecords);

      if (tiersError) {
        console.error('Error creating tiers:', tiersError);
      }
    }

    // Fetch complete campaign with relations
    const { data: completeCampaign, error: fetchError } = await supabase
      .from('promotion_campaigns')
      .select(`
        *,
        promotion_codes(id, code, usage_count, usage_limit, is_active),
        promotion_targets(id, target_type, course_id, dish_id),
        promotion_tiers(id, tier_order, threshold_amount, discount_type, discount_value)
      `)
      .eq('id', campaign.id)
      .single();

    if (fetchError) {
      // Return basic campaign if fetch fails
      return NextResponse.json({ campaign }, { status: 201 });
    }

    return NextResponse.json({ campaign: completeCampaign }, { status: 201 });
  } catch (error) {
    console.error('Campaigns POST error:', error);
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

