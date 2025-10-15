import { createClient } from '@/lib/supabase/server'

export async function getRestaurants(filters?: {
  province?: string
  city?: string
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('menuca_v3.restaurants')
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
    .from('menuca_v3.restaurants')
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
    .from('menuca_v3.orders')
    .select(`
      *,
      restaurants:restaurant_id (name),
      users:user_id (email)
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
  return data
}

export async function getDashboardStats() {
  const supabase = await createClient()
  
  // Get total orders count
  const { count: totalOrders } = await supabase
    .from('menuca_v3.orders')
    .select('*', { count: 'exact', head: true })

  // Get total revenue
  const { data: revenueData } = await supabase
    .from('menuca_v3.orders')
    .select('total')
    
  const totalRevenue = revenueData?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0

  // Get active restaurants count
  const { count: activeRestaurants } = await supabase
    .from('menuca_v3.restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get total users count
  const { count: totalUsers } = await supabase
    .from('menuca_v3.users')
    .select('*', { count: 'exact', head: true })

  return {
    totalOrders: totalOrders || 0,
    totalRevenue,
    activeRestaurants: activeRestaurants || 0,
    totalUsers: totalUsers || 0,
  }
}

export async function getCoupons() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('menuca_v3.promotional_coupons')
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
    .from('menuca_v3.users')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.search) {
    query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
