import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_PAYMENT_OPTIONS = [
  {
    payment_type: 'credit_card',
    enabled: true,
    label_en: 'Credit Card',
    label_fr: 'Carte de crédit',
    display_order: 0,
  }
]

function extractIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/)
  if (match) return parseInt(match[1], 10)
  const numericMatch = slug.match(/^(\d+)$/)
  if (numericMatch) return parseInt(numericMatch[1], 10)
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any
    
    const restaurantId = extractIdFromSlug(params.slug)
    console.log('[Customer Payment Options] Slug:', params.slug, 'Restaurant ID:', restaurantId)
    
    if (!restaurantId) {
      console.log('[Customer Payment Options] No restaurant ID found, returning defaults')
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }
    
    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .select('payment_method, is_enabled, english_label, french_label, display_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Customer Payment Options] Database error:', error)
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
      }
      throw error
    }

    console.log('[Customer Payment Options] Raw data from DB:', data)

    if (!data || data.length === 0) {
      console.log('[Customer Payment Options] No enabled payment options found, returning defaults')
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }

    const transformedOptions = data.map((row: any) => ({
      payment_type: row.payment_method,
      enabled: row.is_enabled,
      label_en: row.english_label,
      label_fr: row.french_label,
      display_order: row.display_order,
    }))

    console.log('[Customer Payment Options] Transformed options:', transformedOptions)

    return NextResponse.json(transformedOptions)
  } catch (error: any) {
    console.error('[Customer Payment Options GET] Error:', error)
    return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
  }
}
