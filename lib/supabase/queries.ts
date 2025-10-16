import { createClient } from '@/lib/supabase/server'

export async function getRestaurants(filters?: {
  province?: string
  city?: string
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  
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

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
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
  
  // Transform data to ensure consistent structure
  return data?.map((order: any) => ({
    ...order,
    restaurant: order.restaurant || { id: order.restaurant_id, name: 'Unknown Restaurant' },
    user: order.user || { id: order.user_id, email: 'Unknown User' }
  })) || []
}

export async function getDashboardStats() {
  const supabase = await createClient()
  
  // Get total orders count
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // Get total revenue
  const { data: revenueData } = await supabase
    .from('orders')
    .select('total')
    
  const totalRevenue = revenueData?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0

  // Get active restaurants count
  const { count: activeRestaurants } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get total users count
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Get top restaurants by order count and revenue
  const { data: ordersByRestaurant } = await supabase
    .from('orders')
    .select('restaurant_id, total, restaurants:restaurant_id (id, name)')
  
  // Aggregate orders and revenue by restaurant
  const restaurantStats = new Map<number, { 
    id: number, 
    name: string, 
    orders: number, 
    revenue: number 
  }>()
  
  ordersByRestaurant?.forEach((order: any) => {
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

  // Convert to array and sort by order count
  const topRestaurants = Array.from(restaurantStats.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)

  return {
    totalOrders: totalOrders || 0,
    totalRevenue,
    activeRestaurants: activeRestaurants || 0,
    totalUsers: totalUsers || 0,
    topRestaurants,
  }
}

export async function getRevenueHistory(timeRange: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const supabase = await createClient()
  
  // Determine date range based on time range
  const now = new Date()
  let startDate = new Date()
  let periods: { key: string, label: string }[] = []
  
  if (timeRange === 'daily') {
    // Last 7 days using local calendar dates
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      periods.push({
        key: `${year}-${month}-${day}`, // Local YYYY-MM-DD
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      })
    }
  } else if (timeRange === 'weekly') {
    // Last 4 weeks using local calendar dates
    startDate.setDate(now.getDate() - 27) // 4 weeks = 28 days
    startDate.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const startKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
      const endKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
      
      periods.push({
        key: `${startKey}_${endKey}`, // Local date range
        label: `Week ${i + 1}`
      })
    }
  } else {
    // Last 6 months using local calendar dates
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
  
  // Query orders for the date range
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })
  
  // Initialize revenue map with all periods set to 0
  const revenueMap = new Map<string, number>()
  periods.forEach(period => revenueMap.set(period.key, 0))
  
  // Aggregate orders into periods using local time boundaries
  orders?.forEach((order: any) => {
    const orderDate = new Date(order.created_at)
    let periodKey: string
    
    if (timeRange === 'daily') {
      // Use local date for bucketing
      const year = orderDate.getFullYear()
      const month = String(orderDate.getMonth() + 1).padStart(2, '0')
      const day = String(orderDate.getDate()).padStart(2, '0')
      periodKey = `${year}-${month}-${day}`
    } else if (timeRange === 'weekly') {
      // Find which week this order belongs to using local dates
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
      // Use local year/month for bucketing
      const year = orderDate.getFullYear()
      const month = String(orderDate.getMonth() + 1).padStart(2, '0')
      periodKey = `${year}-${month}`
    }
    
    if (periodKey && revenueMap.has(periodKey)) {
      revenueMap.set(periodKey, (revenueMap.get(periodKey) || 0) + (order.total || 0))
    }
  })
  
  // Convert to array with proper labels
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
    .order('created_at', { ascending: false })

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
