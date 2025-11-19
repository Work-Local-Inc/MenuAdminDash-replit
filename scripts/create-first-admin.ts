import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

async function createFirstAdmin() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'menuca_v3' } }
  )

  // Check if brian+1 already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id, email')
    .eq('email', 'brian+1@worklocal.ca')
    .single()

  if (existing) {
    console.log('✅ Admin user already exists:', existing.email)
    return
  }

  // Create brian+1 as first admin
  const passwordHash = await bcrypt.hash('WL!2w3e4r5t', 10)
  
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: 'brian+1@worklocal.ca',
      first_name: 'Brian',
      last_name: 'Admin',
      password_hash: passwordHash,
      mfa_enabled: false,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating first admin:', error)
    process.exit(1)
  }

  console.log('✅ First admin user created:', data.email, 'ID:', data.id)
}

createFirstAdmin()
