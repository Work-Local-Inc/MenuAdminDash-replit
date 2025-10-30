import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  const client = await pool.connect();
  
  try {
    const groupId = parseInt(params.groupId);
    const { modifier_ids } = await request.json();

    if (!Array.isArray(modifier_ids) || modifier_ids.length === 0) {
      return NextResponse.json(
        { error: 'modifier_ids array is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    for (let i = 0; i < modifier_ids.length; i++) {
      await client.query(
        `UPDATE menuca_v3.dish_modifier_items 
         SET display_order = $1, updated_at = NOW()
         WHERE id = $2 AND modifier_group_id = $3`,
        [i, modifier_ids[i], groupId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reordering modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to reorder modifiers' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
