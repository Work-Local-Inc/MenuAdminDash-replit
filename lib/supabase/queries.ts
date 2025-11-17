import { createClient } from '@/lib/supabase/server'

export async function getRestaurants(filters?: {
  province?: string
  city?: string
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('restaurants')
      .select('*, restaurant_locations!restaurant_locations_restaurant_id_fkey(city_id, province_id, is_primary, cities(name))')
      .order('id', { ascending: false })
    
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status)
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Get restaurants error:', error)
      return []
    }
    
    console.log(`[getRestaurants] Found ${data?.length || 0} restaurants with filters:`, filters)
    
    return (data || []).map((restaurant: any) => {
      const primaryLocation = restaurant.restaurant_locations?.find((loc: any) => loc.is_primary)
      return {
        ...restaurant,
        city: primaryLocation?.cities?.name || null,
        province: null, // Simplified for now - can fetch separately if needed
        restaurant_locations: undefined
      }
    })
  } catch (error) {
    console.error('Get restaurants error:', error)
    return []
  }
}

export async function getRestaurantById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getOrders(filters?: {
  restaurant_id?: string
  status?: string
  limit?: number
}) {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('orders')
      .select('*, restaurants(id, name), users!orders_user_id_fkey(id, email, first_name, last_name)')
      .order('created_at', { ascending: false })
    
    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', filters.restaurant_id)
    }
    
    if (filters?.status) {
      query = query.eq('order_status', filters.status)
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Get orders error:', error)
      return []
    }
    
    return (data || []).map((order: any) => ({
      ...order,
      status: order.order_status,
      total: order.total_amount,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      tax: order.tax_amount,
      tip: order.tip_amount,
      delivery_address: order.delivery_address,
      special_instructions: order.special_instructions,
      restaurant: order.restaurants || { id: order.restaurant_id, name: 'Unknown Restaurant' },
      user: order.users || { id: order.user_id, email: 'Unknown User', first_name: '', last_name: '' }
    }))
  } catch (error) {
    console.error('Get orders error:', error)
    return []
  }
}

export async function getDashboardStats() {
  const supabase = await createClient()
  
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const [
      ordersCountRes,
      ordersRes,
      restaurantsCountRes,
      usersCountRes,
      recentOrdersRes
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount'),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('orders').select('restaurant_id, total_amount, created_at').gte('created_at', thirtyDaysAgo.toISOString())
    ])
    
    const totalRevenue = (ordersRes.data || []).reduce((sum: number, order: any) => sum + (parseFloat(order.total_amount) || 0), 0)
    
    const restaurantStats = new Map<number, { name: string, orders: number, revenue: number }>()
    const restaurantIds = new Set((recentOrdersRes.data || []).map((o: any) => o.restaurant_id))
    
    if (restaurantIds.size > 0) {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', Array.from(restaurantIds))
        .eq('status', 'active')
      
      restaurants?.forEach((r: any) => {
        restaurantStats.set(r.id, { name: r.name, orders: 0, revenue: 0 })
      })
      
      recentOrdersRes.data?.forEach((order: any) => {
        const stats = restaurantStats.get(order.restaurant_id)
        if (stats) {
          stats.orders++
          stats.revenue += parseFloat(order.total_amount) || 0
        }
      })
    }
    
    const topRestaurants = Array.from(restaurantStats.entries())
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        orders: stats.orders,
        revenue: stats.revenue,
        rating: 4.5 + Math.random() * 0.5
      }))
      .filter(r => r.orders > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
    
    return {
      totalOrders: ordersCountRes.count || 0,
      totalRevenue,
      activeRestaurants: restaurantsCountRes.count || 0,
      totalUsers: usersCountRes.count || 0,
      topRestaurants
    }
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return {
      totalOrders: 0,
      totalRevenue: 0,
      activeRestaurants: 0,
      totalUsers: 0,
      topRestaurants: []
    }
  }
}

export async function getRevenueHistory(timeRange: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const supabase = await createClient()
  
  const now = new Date()
  let startDate = new Date()
  let periods: { key: string, label: string }[] = []
  
  if (timeRange === 'daily') {
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      periods.push({
        key: `${year}-${month}-${day}`,
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      })
    }
  } else if (timeRange === 'weekly') {
    startDate.setDate(now.getDate() - 27)
    startDate.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const startKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
      const endKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
      
      periods.push({
        key: `${startKey}_${endKey}`,
        label: `Week ${i + 1}`
      })
    }
  } else {
    startDate.setMonth(now.getMonth() - 5)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(startDate)
      monthDate.setMonth(startDate.getMonth() + i)
      periods.push({
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        label: monthDate.toLocaleDateString('en-US', { month: 'short' })
      })
    }
  }
  
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
  
    const revenueMap = new Map<string, number>()
    periods.forEach(period => revenueMap.set(period.key, 0))
    
    orders?.forEach((order: any) => {
    const orderDate = new Date(order.created_at)
    let periodKey: string
    
    if (timeRange === 'daily') {
      const year = orderDate.getFullYear()
      const month = String(orderDate.getMonth() + 1).padStart(2, '0')
      const day = String(orderDate.getDate()).padStart(2, '0')
      periodKey = `${year}-${month}-${day}`
    } else if (timeRange === 'weekly') {
      const period = periods.find(p => {
        const [startKey, endKey] = p.key.split('_')
        const [sYear, sMonth, sDay] = startKey.split('-').map(Number)
        const [eYear, eMonth, eDay] = endKey.split('-').map(Number)
        
        const periodStart = new Date(sYear, sMonth - 1, sDay, 0, 0, 0)
        const periodEnd = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999)
        
        return orderDate >= periodStart && orderDate <= periodEnd
      })
      periodKey = period?.key || ''
    } else {
      const year = orderDate.getFullYear()
      const month = String(orderDate.getMonth() + 1).padStart(2, '0')
      periodKey = `${year}-${month}`
    }
    
      if (periodKey && revenueMap.has(periodKey)) {
        revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + (parseFloat(order.total_amount) || 0))
      }
    })
    
    return periods.map(period => ({
      date: period.label,
      revenue: revenueMap.get(period.key) || 0
    }))
  } catch (error) {
    console.error('Revenue history error:', error)
    return periods.map(period => ({
      date: period.label,
      revenue: 0
    }))
  }
}

export async function getCoupons() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('promotional_coupons')
    .select('*')
    .order('created_at', { ascending: false})

  if (error) throw error
  return data
}

export async function getUsers(filters?: {
  role?: string
  search?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.search) {
    query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
