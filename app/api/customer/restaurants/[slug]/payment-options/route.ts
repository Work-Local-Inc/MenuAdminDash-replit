import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any
    const { searchParams } = new URL(request.url)
    const orderType = searchParams.get('order_type') || 'both'
    
    const restaurantId = extractIdFromSlug(params.slug)
    if (!restaurantId) {
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }
    
    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .select('payment_type, enabled, applies_to, label_en, label_fr, instructions_en, instructions_fr, display_order')
      .eq('restaurant_id', restaurantId)
      .eq('enabled', true)
      .order('display_order', { ascending: true })

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
      }
      throw error
    }

    let options: any[] = data || []
    
    if (options.length === 0) {
      return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
    }

    if (orderType !== 'both') {
      options = options.filter((opt: any) => 
        opt.applies_to === 'both' || opt.applies_to === orderType
      )
    }

    return NextResponse.json(options)
  } catch (error: any) {
    console.error('[Customer Payment Options GET] Error:', error)
    return NextResponse.json(DEFAULT_PAYMENT_OPTIONS)
  }
}
