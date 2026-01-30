import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)
    
    // Verify restaurant access for Restaurant Admins
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    
    // Fetch from restaurant_contacts table (primary source)
    const { data: restaurantContacts, error: contactsError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_contacts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    
    if (contactsError) {
      console.error('[Contacts API] restaurant_contacts query error:', contactsError)
    }
    
    // If we have contacts in restaurant_contacts table, return those
    if (restaurantContacts && restaurantContacts.length > 0) {
      return NextResponse.json(restaurantContacts)
    }
    
    // Fallback: Fetch from admin_user_restaurants and restaurant_locations for backwards compatibility
    const { data: adminContacts, error: adminError } = await supabase
      .schema('menuca_v3')
      .from('admin_user_restaurants')
      .select(`
        id,
        role,
        admin_user:admin_users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('restaurant_id', restaurantId)
    
    if (adminError) {
      console.error('[Contacts API] Admin users query error:', adminError)
    }
    
    // Fetch public contact info from restaurant_locations
    const { data: locationContacts, error: locationError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_locations')
      .select('id, phone, email, is_primary')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
    
    if (locationError) {
      console.error('[Contacts API] Locations query error:', locationError)
    }
    
    // Combine both sources into a unified response
    const contacts = []
    
    // Add admin users as contacts (owner/manager)
    if (adminContacts) {
      for (const ac of adminContacts) {
        if (ac.admin_user) {
          contacts.push({
            id: ac.id,
            type: 'admin',
            role: ac.role || 'Owner',
            first_name: ac.admin_user.first_name,
            last_name: ac.admin_user.last_name,
            email: ac.admin_user.email,
            phone: null, // Admin users don't have phone in this table
            is_primary: true
          })
        }
      }
    }
    
    // Add location contacts (public)
    if (locationContacts) {
      for (const lc of locationContacts) {
        if (lc.phone || lc.email) {
          contacts.push({
            id: lc.id,
            type: 'location',
            role: 'Restaurant',
            first_name: null,
            last_name: null,
            email: lc.email,
            phone: lc.phone,
            is_primary: lc.is_primary
          })
        }
      }
    }
    
    return NextResponse.json(contacts)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)
    
    // Verify restaurant access for Restaurant Admins
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    const body = await request.json()

    const { data, error } = await supabase.functions.invoke('add-restaurant-contact', {
      body: {
        restaurant_id: parseInt(params.id),
        ...body
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to add contact' 
      }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 500 }
    )
  }
}
