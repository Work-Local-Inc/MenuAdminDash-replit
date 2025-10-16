import { createClient } from '@/lib/supabase/server'
import { AdminUsersClient } from '@/app/admin/users/admin-users-client'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Fetch initial admin users
  const { data: adminUsers, count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 49)

  return (
    <AdminUsersClient 
      initialAdminUsers={adminUsers || []} 
      initialCount={count || 0} 
    />
  )
}
