import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } }
) {
  const client = await pool.connect();
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    const modifierId = parseInt(params.modifierId);
    const body = await request.json();

    const { name, price, is_default } = body;

    // Verify the modifier belongs to the group and the group belongs to the dish
    const verifyResult = await client.query(
      `SELECT mi.id 
       FROM menuca_v3.dish_modifier_items mi
       JOIN menuca_v3.dish_modifier_groups mg ON mi.modifier_group_id = mg.id
       WHERE mi.id = $1 AND mg.id = $2 AND mg.dish_id = $3`,
      [modifierId, groupId, dishId]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Modifier not found or does not belong to this group/dish' },
        { status: 404 }
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

    if (price !== undefined && price !== null) {
      if (price < 0) {
        return NextResponse.json(
          { error: 'Price cannot be negative' },
          { status: 400 }
        );
      }
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }

    if (is_default !== undefined) {
      updates.push(`is_default = $${paramCount++}`);
      values.push(is_default);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(modifierId);

    const result = await client.query(
      `UPDATE menuca_v3.dish_modifier_items 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } }
) {
  const client = await pool.connect();
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    const modifierId = parseInt(params.modifierId);

    // Verify the modifier belongs to the group and the group belongs to the dish
    const verifyResult = await client.query(
      `SELECT mi.id 
       FROM menuca_v3.dish_modifier_items mi
       JOIN menuca_v3.dish_modifier_groups mg ON mi.modifier_group_id = mg.id
       WHERE mi.id = $1 AND mg.id = $2 AND mg.dish_id = $3`,
      [modifierId, groupId, dishId]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Modifier not found or does not belong to this group/dish' },
        { status: 404 }
      );
    }

    const result = await client.query(
      'DELETE FROM menuca_v3.dish_modifier_items WHERE id = $1 RETURNING id',
      [modifierId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting modifier:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
