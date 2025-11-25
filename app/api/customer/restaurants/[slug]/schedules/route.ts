import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';

export interface RestaurantSchedule {
  id: number;
  type: 'delivery' | 'takeout';
  day_start: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  day_stop: number;
  time_start: string; // HH:MM format
  time_stop: string;
  is_enabled: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const slug = params.slug;
    
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    const { data: schedules, error } = await supabase
      .from('restaurant_schedules')
      .select('id, type, day_start, day_stop, time_start, time_stop, is_enabled')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .order('day_start', { ascending: true })
      .order('time_start', { ascending: true });
    
    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      schedules: schedules || [],
      restaurantId,
    });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}
