import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

interface VendorConfig {
  id: number
  vendor_name: string
  company_name: string | null
  tax_rate: number
  payment_terms: string | null
}

interface Assignment {
  id: number
  vendor_id: number
  restaurant_id: number
  commission_rate: number
  version: string
  is_active: boolean
}

interface OrderRow {
  id: number
  subtotal: number
  total_amount: number
  payment_status: string
  order_status: string
  restaurant_id: number
}

interface RestaurantRow {
  id: number
  name: string
}

interface RestaurantCommission {
  restaurant_id: number
  restaurant_name: string
  total: number
  commission_rate: number
  commission: number
}

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!vendorId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: vendorId, startDate, endDate' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: vendorData, error: vendorError } = await (supabase as any)
      .from('vendor_configs')
      .select('id, vendor_name, company_name, tax_rate, payment_terms')
      .eq('id', parseInt(vendorId))
      .single()

    if (vendorError || !vendorData) {
      console.error('[Vendor Commissions] Vendor not found:', vendorError)
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const vendor = vendorData as VendorConfig

    const { data: assignmentsData, error: assignmentsError } = await (supabase as any)
      .from('vendor_restaurant_assignments')
      .select('id, vendor_id, restaurant_id, commission_rate, version, is_active')
      .eq('vendor_id', parseInt(vendorId))
      .eq('is_active', true)

    if (assignmentsError) {
      console.error('[Vendor Commissions] Assignments error:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    const assignments = (assignmentsData || []) as Assignment[]

    if (assignments.length === 0) {
      return NextResponse.json({
        vendor: { id: vendor.id, vendor_name: vendor.vendor_name, company_name: vendor.company_name, tax_rate: parseFloat(String(vendor.tax_rate)) },
        period_start: startDate,
        period_end: endDate,
        versions: {},
        grand_subtotal: 0,
        tax_rate: parseFloat(String(vendor.tax_rate)),
        tax_amount: 0,
        grand_total: 0,
      })
    }

    const restaurantIds = [...new Set(assignments.map(a => a.restaurant_id))]

    const { data: restaurantsData } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', restaurantIds)

    const restaurants = (restaurantsData || []) as RestaurantRow[]
    const restaurantMap = new Map(restaurants.map(r => [r.id, r.name]))

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, subtotal, total_amount, payment_status, order_status, restaurant_id')
      .in('restaurant_id', restaurantIds)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])

    if (ordersError) {
      console.error('[Vendor Commissions] Orders error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    const ordersByRestaurant = new Map<number, OrderRow[]>()
    for (const order of orders) {
      const existing = ordersByRestaurant.get(order.restaurant_id) || []
      existing.push(order)
      ordersByRestaurant.set(order.restaurant_id, existing)
    }

    const versions: Record<string, { restaurants: RestaurantCommission[]; subtotal: number }> = {}

    for (const assignment of assignments) {
      const restaurantOrders = ordersByRestaurant.get(assignment.restaurant_id) || []
      const totalValue = restaurantOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const commissionRate = parseFloat(String(assignment.commission_rate))
      const commission = totalValue * (commissionRate / 100)

      const version = assignment.version || 'v1'
      if (!versions[version]) {
        versions[version] = { restaurants: [], subtotal: 0 }
      }

      versions[version].restaurants.push({
        restaurant_id: assignment.restaurant_id,
        restaurant_name: restaurantMap.get(assignment.restaurant_id) || `Restaurant #${assignment.restaurant_id}`,
        total: Math.round(totalValue * 100) / 100,
        commission_rate: commissionRate,
        commission: Math.round(commission * 100) / 100,
      })

      versions[version].subtotal += commission
    }

    for (const key of Object.keys(versions)) {
      versions[key].subtotal = Math.round(versions[key].subtotal * 100) / 100
    }

    const grandSubtotal = Object.values(versions).reduce((sum, v) => sum + v.subtotal, 0)
    const taxRate = parseFloat(String(vendor.tax_rate))
    const taxAmount = Math.round(grandSubtotal * (taxRate / 100) * 100) / 100
    const grandTotal = Math.round((grandSubtotal + taxAmount) * 100) / 100

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        vendor_name: vendor.vendor_name,
        company_name: vendor.company_name,
        tax_rate: taxRate,
      },
      period_start: startDate,
      period_end: endDate,
      versions,
      grand_subtotal: Math.round(grandSubtotal * 100) / 100,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grandTotal,
    })
  } catch (error: any) {
    console.error('[Vendor Commissions] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}
