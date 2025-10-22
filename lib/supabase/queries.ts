import { createClient } from '@/lib/supabase/server'

export async function getRestaurants(filters?: {
  province?: string
  city?: string
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  
  if (filters?.search) {
    const { data, error } = await supabase.rpc('search_restaurants', {
      p_search_query: filters.search,
      p_latitude: null,
      p_longitude: null,
      p_radius_km: null,
      p_limit: 1000
    } as any)
    
    if (error) throw error
    
    let results: any[] = data || []
    
    if (filters.province && filters.province !== 'All') {
      results = results.filter((r: any) => r.province === filters.province)
    }
    
    if (filters.city && filters.city !== 'All') {
      results = results.filter((r: any) => r.city === filters.city)
    }
    
    if (filters.status && filters.status !== 'All') {
      results = results.filter((r: any) => r.status === filters.status)
    }
    
    return results.map((r: any) => ({
      id: r.restaurant_id,
      name: r.restaurant_name,
      slug: r.slug,
      status: r.status || 'active',
      province: r.province,
      city: r.city,
      cuisines: r.cuisines,
      is_featured: r.is_featured,
      relevance_rank: r.relevance_rank
    }))
  }
  
  let query = supabase
    .from('restaurants')
    .select('*')
    .order('id', { ascending: false })

  if (filters?.province && filters.province !== 'All') {
    query = query.eq('province', filters.province)
  }

  if (filters?.city && filters.city !== 'All') {
    query = query.eq('city', filters.city)
  }

  if (filters?.status && filters.status !== 'All') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw error
  return data
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
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      restaurant:restaurant_id (id, name),
      user:user_id (id, email, first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.restaurant_id) {
    query = query.eq('restaurant_id', filters.restaurant_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  
  return data?.map((order: any) => ({
    ...order,
    restaurant: order.restaurant || { id: order.restaurant_id, name: 'Unknown Restaurant' },
    user: order.user || { id: order.user_id, email: 'Unknown User' }
  })) || []
}

export async function getDashboardStats() {
  const supabase = await createClient()
  
  const [ordersResult, revenueResult, restaurantsResult, usersResult, topRestaurantsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true }),
    
    supabase
      .from('orders')
      .select('total'),
    
    supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    
    supabase
      .from('users')
      .select('*', { count: 'estimated', head: true }),
    
    supabase
      .from('orders')
      .select('restaurant_id, total, restaurants:restaurant_id (id, name)')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])
  
  const totalRevenue = revenueResult.data?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0
  
  const restaurantStats = new Map<number, { 
    id: number, 
    name: string, 
    orders: number, 
    revenue: number 
  }>()
  
  topRestaurantsResult.data?.forEach((order: any) => {
    if (order.restaurant_id && order.restaurants) {
      const existing = restaurantStats.get(order.restaurant_id) || {
        id: order.restaurants.id,
        name: order.restaurants.name,
        orders: 0,
        revenue: 0
      }
      existing.orders += 1
      existing.revenue += order.total || 0
      restaurantStats.set(order.restaurant_id, existing)
    }
  })

  const topRestaurants = Array.from(restaurantStats.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)

  return {
    totalOrders: ordersResult.count || 0,
    totalRevenue,
    activeRestaurants: restaurantsResult.count || 0,
    totalUsers: usersResult.count || 0,
    topRestaurants,
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
  
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total')
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
      revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + (order.total || 0))
    }
  })
  
  return periods.map(period => ({
    date: period.label,
    revenue: revenueMap.get(period.key) || 0
  }))
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
