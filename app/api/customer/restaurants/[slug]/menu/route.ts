import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const slug = params.slug;
    
    // Extract restaurant ID from slug
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    // Fetch menu with courses and dishes
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        description,
        display_order,
        dishes (
          id,
          name,
          description,
          base_price,
          image_url,
          has_customization,
          is_active,
          prices,
          size_options
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (coursesError) {
      throw coursesError;
    }
    
    // For each dish, fetch modifiers if has_customization is true
    const coursesWithModifiers = await Promise.all(
      (courses || []).map(async (course) => {
        const dishesWithModifiers = await Promise.all(
          (course.dishes || []).filter((dish: any) => dish.is_active).map(async (dish: any) => {
            if (dish.has_customization) {
              const { data: modifiers } = await supabase
                .from('dish_modifiers')
                .select('id, name, price, is_required, display_order')
                .eq('dish_id', dish.id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });
              
              return {
                ...dish,
                modifiers: modifiers || [],
              };
            }
            
            return {
              ...dish,
              modifiers: [],
            };
          })
        );
        
        return {
          ...course,
          dishes: dishesWithModifiers,
        };
      })
    );
    
    return NextResponse.json(coursesWithModifiers);
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
