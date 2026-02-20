import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

const DEFAULT_PAYMENT_OPTIONS = [
  {
    payment_type: 'credit_card',
    enabled: true,
    applies_to: 'both',
    label_en: 'Credit Card',
    label_fr: 'Carte de crédit',
    instructions_en: null,
    instructions_fr: null,
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

function transformRow(row: any) {
  return {
    payment_type: row.payment_method,
    enabled: row.is_enabled,
    applies_to: row.applies_to || 'both',
    label_en: row.english_label,
    label_fr: row.french_label,
    instructions_en: row.instructions_en || null,
    instructions_fr: row.instructions_fr || null,
    display_order: row.display_order,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createAdminClient() as any
    const orderType = request.nextUrl.searchParams.get('order_type') || 'both'
    
    const restaurantId = extractIdFromSlug(params.slug)
    
    if (!restaurantId) {
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }
    
    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Customer Payment Options] Database error:', error)
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }

    const transformed = data.map(transformRow)

    const filteredOptions = transformed.filter((row: any) => {
      if (row.applies_to === 'both') return true
      if (orderType === 'pickup' && row.applies_to === 'pickup') return true
      if (orderType === 'delivery' && row.applies_to === 'delivery') return true
      return false
    })

    if (filteredOptions.length === 0) {
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }

    return NextResponse.json(filteredOptions)
  } catch (error: any) {
    console.error('[Customer Payment Options GET] Error:', error)
    return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
  }
}
