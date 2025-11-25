import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Direct REST API call to Supabase to list what's available
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
        }
      }
    )
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      availableEndpoints: data,
      responseStatus: response.status,
      note: 'This shows what tables/views are exposed by PostgREST API'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
