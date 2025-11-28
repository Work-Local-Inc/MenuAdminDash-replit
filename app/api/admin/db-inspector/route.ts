import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = await createClient() as any
    
    // Get all BASE TABLES ONLY in menuca_v3 schema (excludes views and partitions)
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'menuca_v3')
      .eq('table_type', 'BASE TABLE')
      .not('table_name', 'like', '%\\_202%')
      .order('table_name')

    if (tablesError) {
      console.error('Error fetching tables:', tablesError)
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 500 }
      )
    }

    console.log('DB Inspector - Tables query result:', {
      rows: tablesData?.length || 0,
      sampleRows: tablesData?.slice(0, 5)
    })

    const tables = (tablesData || []).map((row: any) => row.table_name)
    console.log('DB Inspector - Total tables found:', tables.length)

    // Get columns for each table
    const schemaDetails: Record<string, any[]> = {}
    
    for (const tableName of tables) {
      const { data: columnsData } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'menuca_v3')
        .eq('table_name', tableName)
        .order('ordinal_position')
      
      schemaDetails[tableName] = columnsData || []
    }

    // Get row counts for each table
    const tableCounts: Record<string, number> = {}
    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        tableCounts[tableName] = error ? -1 : (count || 0)
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('DB Inspector Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to inspect database schema' },
      { status: 500 }
    )
  }
}
