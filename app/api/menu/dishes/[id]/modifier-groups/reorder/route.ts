import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  
  try {
    const dishId = parseInt(params.id);
    const { group_ids } = await request.json();

    if (!Array.isArray(group_ids) || group_ids.length === 0) {
      return NextResponse.json(
        { error: 'group_ids array is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    for (let i = 0; i < group_ids.length; i++) {
      await client.query(
        `UPDATE menuca_v3.modifier_groups 
         SET display_order = $1, updated_at = NOW()
         WHERE id = $2 AND dish_id = $3`,
        [i, group_ids[i], dishId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reordering modifier groups:', error);
    return NextResponse.json(
      { error: 'Failed to reorder modifier groups' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
