import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const groupId = parseInt(params.groupId);

    const result = await pool.query(
      `SELECT 
        id,
        modifier_group_id,
        name,
        price,
        is_default,
        display_order,
        created_at,
        updated_at
      FROM menuca_v3.dish_modifier_items
      WHERE modifier_group_id = $1
      ORDER BY display_order ASC, created_at ASC`,
      [groupId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const groupId = parseInt(params.groupId);
    const body = await request.json();

    const { name, price, is_default } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    const maxDisplayOrder = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM menuca_v3.dish_modifier_items WHERE modifier_group_id = $1',
      [groupId]
    );
    const nextOrder = maxDisplayOrder.rows[0].max_order + 1;

    const result = await pool.query(
      `INSERT INTO menuca_v3.dish_modifier_items (
        modifier_group_id,
        name,
        price,
        is_default,
        display_order
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        groupId,
        name.trim(),
        price,
        is_default ?? false,
        nextOrder
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier' },
      { status: 500 }
    );
  }
}
