import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    
    // Check if modifier_groups table exists
    const { data: groupsTableData } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'menuca_v3')
      .eq('table_name', 'modifier_groups')
      .single();
    
    const groupsTableExists = !!groupsTableData;
    
    // Check if dish_modifiers table exists
    const { data: modifiersTableData } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'menuca_v3')
      .eq('table_name', 'dish_modifiers')
      .single();
    
    const modifiersTableExists = !!modifiersTableData;
    
    // NOTE: Table creation (DDL operations) are not supported by Supabase JavaScript client.
    // In production, these tables should be created through database migrations, not API routes.
    // If tables don't exist, they must be created manually or through migration scripts.
    
    if (!groupsTableExists || !modifiersTableExists) {
      return NextResponse.json({
        success: false,
        message: 'Modifier tables do not exist. Please create them using database migrations.',
        tables: {
          modifier_groups: groupsTableExists ? 'exists' : 'missing - create via migration',
          dish_modifiers: modifiersTableExists ? 'exists' : 'missing - create via migration'
        }
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Modern modifier tables verified successfully',
      tables: {
        modifier_groups: 'exists',
        dish_modifiers: 'exists'
      }
    });
    
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to verify modifier tables', details: error.message },
      { status: 500 }
    );
  }
}
