import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Try to get list of tables from information_schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      // Fallback: Try RPC to list tables
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_tables')
        .single()
      
      return NextResponse.json({
        success: false,
        error: 'Could not query information_schema',
        tablesError,
        rpcError,
        attemptedRpc: true,
        envCheck: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...'
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      publicTables: tables || [],
      tableCount: tables?.length || 0,
      envCheck: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) + '...'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Debug query failed',
      details: error?.message || String(error),
      envCheck: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 500 })
  }
}
