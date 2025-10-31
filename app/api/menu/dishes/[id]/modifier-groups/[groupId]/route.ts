import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    const body = await request.json();

    const { name, is_required, min_selections, max_selections } = body;

    // Validate min/max relationship
    const finalMin = min_selections !== undefined ? min_selections : null;
    const finalMax = max_selections !== undefined ? max_selections : null;
    
    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      return NextResponse.json(
        { error: 'min_selections cannot be greater than max_selections' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (is_required !== undefined) {
      updates.push(`is_required = $${paramCount++}`);
      values.push(is_required);
    }

    if (min_selections !== undefined) {
      updates.push(`min_selections = $${paramCount++}`);
      values.push(min_selections);
    }

    if (max_selections !== undefined) {
      updates.push(`max_selections = $${paramCount++}`);
      values.push(max_selections);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(groupId);
    values.push(dishId);

    const result = await pool.query(
      `UPDATE menuca_v3.modifier_groups 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND dish_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Modifier group not found or does not belong to this dish' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);

    const result = await pool.query(
      'DELETE FROM menuca_v3.modifier_groups WHERE id = $1 AND dish_id = $2 RETURNING id',
      [groupId, dishId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Modifier group not found or does not belong to this dish' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier group' },
      { status: 500 }
    );
  }
}
