import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);

    const result = await pool.query(
      `SELECT 
        dish_id,
        is_available,
        unavailable_until,
        reason,
        notes,
        updated_by_admin_id,
        updated_at
      FROM menuca_v3.dish_inventory
      WHERE dish_id = $1`,
      [dishId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        dish_id: dishId,
        is_available: true,
        unavailable_until: null,
        reason: null,
        notes: null,
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching dish inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dish inventory' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const body = await request.json();

    const { is_available, unavailable_until, reason, notes } = body;

    const result = await pool.query(
      `INSERT INTO menuca_v3.dish_inventory (
        dish_id,
        is_available,
        unavailable_until,
        reason,
        notes,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (dish_id) 
      DO UPDATE SET
        is_available = $2,
        unavailable_until = $3,
        reason = $4,
        notes = $5,
        updated_at = NOW()
      RETURNING *`,
      [
        dishId,
        is_available ?? true,
        unavailable_until || null,
        reason || null,
        notes || null
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating dish inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update dish inventory' },
      { status: 500 }
    );
  }
}
