import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const checkGroupsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'dish_modifier_groups'
      );
    `);
    
    const groupsTableExists = checkGroupsTable.rows[0].exists;
    
    if (!groupsTableExists) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS menuca_v3.dish_modifier_groups (
          id BIGSERIAL PRIMARY KEY,
          dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_required BOOLEAN NOT NULL DEFAULT FALSE,
          min_selections INTEGER NOT NULL DEFAULT 0,
          max_selections INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_dish_id 
          ON menuca_v3.dish_modifier_groups(dish_id);
        CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_display_order 
          ON menuca_v3.dish_modifier_groups(dish_id, display_order);

        COMMENT ON TABLE menuca_v3.dish_modifier_groups IS 
          'Modern modifier groups (e.g., Size, Toppings) with validation rules';
      `);
    }
    
    const checkModifiersTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'dish_modifier_items'
      );
    `);
    
    const modifiersTableExists = checkModifiersTable.rows[0].exists;
    
    if (!modifiersTableExists) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS menuca_v3.dish_modifier_items (
          id BIGSERIAL PRIMARY KEY,
          modifier_group_id BIGINT NOT NULL REFERENCES menuca_v3.dish_modifier_groups(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_dish_modifier_items_group_id 
          ON menuca_v3.dish_modifier_items(modifier_group_id);
        CREATE INDEX IF NOT EXISTS idx_dish_modifier_items_display_order 
          ON menuca_v3.dish_modifier_items(modifier_group_id, display_order);

        COMMENT ON TABLE menuca_v3.dish_modifier_items IS 
          'Modern modifier options (e.g., Large, Extra Cheese) with pricing';
      `);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Modern modifier tables checked/created successfully',
      tables: {
        dish_modifier_groups: groupsTableExists ? 'already exists' : 'created',
        dish_modifier_items: modifiersTableExists ? 'already exists' : 'created'
      }
    });
    
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup modifier tables', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
