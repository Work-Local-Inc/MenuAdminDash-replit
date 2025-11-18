import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'menuca_v3' },
      auth: { persistSession: false }
    });

    // Try to add the column by running raw SQL
    // We'll use a trick: try to select from the column first
    const { error: checkError } = await supabase
      .from('restaurants')
      .select('verified')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      // Column doesn't exist, we need to add it
      // Since Supabase doesn't have a direct SQL execution method in the client,
      // we'll need to use the REST API directly
      const sqlQuery = `
        ALTER TABLE menuca_v3.restaurants 
        ADD COLUMN verified boolean DEFAULT false;
      `;

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: sqlQuery })
      });

      if (!response.ok) {
        // If exec_sql doesn't exist, return instructions for manual migration
        return NextResponse.json({
          success: false,
          message: 'Column needs to be added manually',
          sql: 'ALTER TABLE menuca_v3.restaurants ADD COLUMN verified boolean DEFAULT false;',
          instructions: 'Please run this SQL in Supabase SQL Editor, then try again.'
        });
      }
    }

    // Column exists or was just created, now update the verified restaurants
    const verifiedRestaurantIds = [
      816, 502, 376, 160, 119, 105, 245, 8, 133, 
      269, 234, 87, 491, 846, 845, 607, 1009
    ];

    const { data, error: updateError } = await supabase
      .from('restaurants')
      .update({ verified: true })
      .in('id', verifiedRestaurantIds)
      .select('id, name');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update restaurants', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully verified ${data?.length || 0} restaurants`,
      restaurants: data
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}
