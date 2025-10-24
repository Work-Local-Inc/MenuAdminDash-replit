import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/postgres'

export async function GET(request: NextRequest) {
  try {
    // Get all tables in menuca_v3 schema
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'menuca_v3' 
      ORDER BY table_name;
    `)

    const tables = tablesResult.rows.map(row => row.table_name)

    // Get columns for each table
    const schemaDetails: Record<string, any[]> = {}
    
    for (const tableName of tables) {
      const columnsResult = await query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'menuca_v3' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName])
      
      schemaDetails[tableName] = columnsResult.rows
    }

    // Get row counts for each table
    const tableCounts: Record<string, number> = {}
    for (const tableName of tables) {
      try {
        const countResult = await query(`SELECT COUNT(*)::int as count FROM menuca_v3."${tableName}"`)
        tableCounts[tableName] = countResult.rows[0]?.count || 0
      } catch (e) {
        tableCounts[tableName] = -1 // Error counting
      }
    }

    return NextResponse.json({
      schema: 'menuca_v3',
      tables: tables,
      tableCount: tables.length,
      schemaDetails,
      tableCounts,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('DB Inspector Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to inspect database schema' },
      { status: 500 }
    )
  }
}
