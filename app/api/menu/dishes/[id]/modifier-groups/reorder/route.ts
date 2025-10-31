import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  
  try {
    const dishId = parseInt(params.id);
    if (isNaN(dishId) || dishId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }

    const { group_ids } = await request.json();

    if (!Array.isArray(group_ids) || group_ids.length === 0) {
      return NextResponse.json(
        { error: 'group_ids array is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify all groups belong to this dish
    const verifyResult = await client.query(
      'SELECT COUNT(*) as count FROM menuca_v3.modifier_groups WHERE id = ANY($1) AND dish_id = $2',
      [group_ids, dishId]
    );

    if (parseInt(verifyResult.rows[0].count) !== group_ids.length) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Some modifier groups do not belong to this dish' },
        { status: 400 }
      );
    }

    for (let i = 0; i < group_ids.length; i++) {
      const updateResult = await client.query(
        `UPDATE menuca_v3.modifier_groups 
         SET display_order = $1, updated_at = NOW()
         WHERE id = $2 AND dish_id = $3`,
        [i, group_ids[i], dishId]
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Modifier group ${group_ids[i]} not found` },
          { status: 404 }
        );
      }
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
