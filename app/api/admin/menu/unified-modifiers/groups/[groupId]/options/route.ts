import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/auth/admin-check"
import { createClient } from "@/lib/supabase/server"

interface ModifierOption {
  id: number
  name: string
  price: number
  is_default: boolean
  is_included: boolean
  display_order: number
  modifier_type: string | null
}

interface ComboModifierOption {
  id: number
  name: string
  price: number
  is_default: boolean
  is_included: boolean
  display_order: number
  modifier_type: string | null
  size_prices?: Array<{
    size: string
    price: number
  }>
  placements?: Array<{
    placement: string
    price_modifier: number
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    await verifyAdminAuth()
    const supabase = await createClient()
    
    const groupId = parseInt(params.groupId)
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') as 'simple' | 'combo'
    
    if (!groupId || isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 })
    }
    
    if (!source || !['simple', 'combo'].includes(source)) {
      return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
    }
    
    let options: ModifierOption[] | ComboModifierOption[] = []
    
    if (source === 'simple') {
      const { data, error } = await supabase
        .schema('menuca_v3')
        .from('modifiers')
        .select('id, name, is_default, is_included, display_order, modifier_type')
        .eq('modifier_group_id', groupId)
        .order('display_order')
      
      if (error) {
        console.error('Error fetching simple modifiers:', error)
        throw error
      }
      
      const { data: pricesData } = await supabase
        .schema('menuca_v3')
        .from('modifier_prices')
        .select('modifier_id, price')
        .in('modifier_id', data?.map(m => m.id) || [])
      
      const priceMap = new Map(pricesData?.map(p => [p.modifier_id, p.price]) || [])
      
      options = (data || []).map(m => ({
        ...m,
        price: priceMap.get(m.id) || 0
      }))
      
    } else {
      // For combo groups, the groupId corresponds to a combo_group which contains
      // combo_group_sections which contain combo_modifier_groups which contain combo_modifiers
      // We need to traverse this hierarchy
      
      // First get the combo_group name for debugging
      const { data: comboGroup } = await supabase
        .schema('menuca_v3')
        .from('combo_groups')
        .select('id, name')
        .eq('id', groupId)
        .single()
      
      console.log('[Options API] Fetching options for combo_group:', { groupId, comboGroupName: comboGroup?.name })
      
      // First get all sections for this combo_group
      const { data: sections } = await supabase
        .schema('menuca_v3')
        .from('combo_group_sections')
        .select('id, name')
        .eq('combo_group_id', groupId)
      
      console.log('[Options API] Found sections:', sections?.map(s => ({ id: s.id, name: s.name })))
      
      if (!sections?.length) {
        // This combo_group has no sections - return empty options
        // Do NOT fall back to combo_modifier_groups - they have separate ID spaces
        console.log('[Options API] No sections found for combo_group, returning empty options')
        options = []
      } else {
        // Traverse the full hierarchy
        const sectionIds = sections.map(s => s.id)
        
        const { data: modifierGroups } = await supabase
          .schema('menuca_v3')
          .from('combo_modifier_groups')
          .select('id, name, is_selected')
          .in('combo_group_section_id', sectionIds)
        
        const groupIds = modifierGroups?.map(g => g.id) || []
        
        console.log('[Options API] Found modifier_groups:', modifierGroups?.map(g => ({ id: g.id, name: g.name })))
        
        const { data: modifiers, error } = await supabase
          .schema('menuca_v3')
          .from('combo_modifiers')
          .select('id, name, display_order, combo_modifier_group_id')
          .in('combo_modifier_group_id', groupIds)
          .order('display_order')
        
        if (error) {
          console.error('Error fetching combo modifiers:', error)
          throw error
        }
        
        const modifierIds = modifiers?.map(m => m.id) || []
        
        const { data: pricesData } = await supabase
          .schema('menuca_v3')
          .from('combo_modifier_prices')
          .select('combo_modifier_id, price, size_variant')
          .in('combo_modifier_id', modifierIds)
        
        // Create a map of group id to group name/selection
        const groupMap = new Map(modifierGroups?.map(g => [g.id, g]) || [])
        
        options = (modifiers || []).map(m => {
          const prices = pricesData?.filter(p => p.combo_modifier_id === m.id) || []
          const basePrice = prices.find(p => !p.size_variant)?.price || prices[0]?.price || 0
          const parentGroup = groupMap.get(m.combo_modifier_group_id)
          
          return {
            id: m.id,
            name: m.name,
            price: basePrice,
            is_default: parentGroup?.is_selected || false,
            is_included: false,
            display_order: m.display_order || 0,
            modifier_type: null,
            size_prices: prices.filter(p => p.size_variant).map(p => ({
              size: p.size_variant || '',
              price: p.price
            }))
          }
        })
      }
    }
    
    return NextResponse.json({
      options,
      source,
      groupId
    })
    
  } catch (error: any) {
    console.error('Error fetching modifier options:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifier options' },
      { status: error.statusCode || 500 }
    )
  }
}
