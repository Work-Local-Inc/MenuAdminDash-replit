import { createClient } from '@/lib/supabase/server'

export async function getRestaurants(filters?: {
  province?: string
  city?: string
  status?: string
  search?: string
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  
  let query = supabase
    .schema('menuca_v3')
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
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getRestaurantById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .schema('menuca_v3')
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
  // Use direct PostgreSQL connection for Supabase production database
  const { query } = await import('@/lib/db/postgres')
  
  try {
    let sql = `
      SELECT 
        o.*,
        json_build_object('id', r.id, 'name', r.name) as restaurant,
        json_build_object('id', u.id, 'email', u.email, 'first_name', u.first_name, 'last_name', u.last_name) as user
      FROM menuca_v3.orders o
      LEFT JOIN menuca_v3.restaurants r ON r.id = o.restaurant_id
      LEFT JOIN menuca_v3.users u ON u.id = o.user_id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.restaurant_id) {
      params.push(filters.restaurant_id)
      sql += ` AND o.restaurant_id = $${params.length}`
    }
    
    if (filters?.status) {
      params.push(filters.status)
      sql += ` AND o.order_status = $${params.length}`
    }
    
    sql += ' ORDER BY o.created_at DESC'
    
    if (filters?.limit) {
      params.push(filters.limit)
      sql += ` LIMIT $${params.length}`
    }
    
    const result = await query(sql, params)
    
    return result.rows.map((order: any) => ({
      ...order,
      // Map production column names to expected format
      status: order.order_status,
      total: order.total_amount,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      tax: order.tax_amount,
      tip: order.tip_amount,
      delivery_address: order.delivery_address,
      special_instructions: order.special_instructions,
      restaurant: order.restaurant || { id: order.restaurant_id, name: 'Unknown Restaurant' },
      user: order.user || { id: order.user_id, email: 'Unknown User', first_name: '', last_name: '' }
    }))
  } catch (error) {
    console.error('Get orders error:', error)
    return []
  }
}

export async function getDashboardStats() {
  // Use direct PostgreSQL connection for Supabase production database
  const { query } = await import('@/lib/db/postgres')
  
  try {
    const [ordersCount, revenueSum, restaurantsCount, usersCount, topRestaurants] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM menuca_v3.orders'),
      query('SELECT COALESCE(SUM(total_amount), 0)::numeric as total FROM menuca_v3.orders'),
      query(`SELECT COUNT(*)::int as count FROM menuca_v3.restaurants WHERE status = 'active'`),
      query('SELECT COUNT(*)::int as count FROM menuca_v3.users WHERE deleted_at IS NULL'),
      query(`
        SELECT 
          r.id,
          r.name,
          COUNT(o.id)::int as orders,
          COALESCE(SUM(o.total_amount), 0)::numeric as revenue
        FROM menuca_v3.restaurants r
        LEFT JOIN menuca_v3.orders o ON o.restaurant_id = r.id
          AND o.created_at >= NOW() - INTERVAL '30 days'
        WHERE r.status = 'active'
        GROUP BY r.id, r.name
        HAVING COUNT(o.id) > 0
        ORDER BY revenue DESC
        LIMIT 10
      `)
    ])
    
    const totalOrders = ordersCount.rows[0]?.count || 0
    const totalRevenue = parseFloat(revenueSum.rows[0]?.total || '0')
    const activeRestaurants = restaurantsCount.rows[0]?.count || 0
    const totalUsers = usersCount.rows[0]?.count || 0
    
    const topRestaurantsList = topRestaurants.rows.map(r => ({
      id: r.id,
      name: r.name,
      orders: r.orders,
      revenue: parseFloat(r.revenue || '0'),
      rating: 4.5 + Math.random() * 0.5 // Mock rating for demo
    }))
    
    return {
      totalOrders,
      totalRevenue,
      activeRestaurants,
      totalUsers,
      topRestaurants: topRestaurantsList
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
  // Use direct PostgreSQL connection for Replit database demo data
  const { query } = await import('@/lib/db/postgres')
  
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
    const result = await query(
      'SELECT created_at, total_amount FROM menuca_v3.orders WHERE created_at >= $1 ORDER BY created_at ASC',
      [startDate.toISOString()]
    )
    const orders = result.rows
  
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
