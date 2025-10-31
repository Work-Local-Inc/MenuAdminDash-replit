import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    if (isNaN(dishId) || dishId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT 
        id,
        dish_id,
        name,
        display_order,
        is_required,
        min_selections,
        max_selections,
        created_at,
        updated_at
      FROM menuca_v3.modifier_groups
      WHERE dish_id = $1
      ORDER BY display_order ASC, created_at ASC`,
      [dishId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifier groups' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    if (isNaN(dishId) || dishId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, is_required, min_selections, max_selections } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const maxDisplayOrder = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM menuca_v3.modifier_groups WHERE dish_id = $1',
      [dishId]
    );
    const nextOrder = maxDisplayOrder.rows[0].max_order + 1;

    const result = await pool.query(
      `INSERT INTO menuca_v3.modifier_groups (
        dish_id,
        name,
        display_order,
        is_required,
        min_selections,
        max_selections
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        dishId,
        name.trim(),
        nextOrder,
        is_required ?? false,
        min_selections ?? 0,
        max_selections ?? 999
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier group' },
      { status: 500 }
    );
  }
}
