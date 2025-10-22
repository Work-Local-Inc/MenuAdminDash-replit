import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'menuca_v3'
  }
})

async function createTestAdmin() {
  try {
    console.log('Creating test admin user...')
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@menu.ca',
      password: 'TestAdmin123!',
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return
    }

    console.log('✓ Auth user created:', authData.user.id)

    // Add to admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: authData.user.id,
        email: 'test@menu.ca',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'super_admin',
        is_active: true,
      })

    if (adminError) {
      console.error('Error adding to admin_users:', adminError)
      return
    }

    console.log('✓ Admin user record created')
    console.log('\nTest admin account ready!')
    console.log('Email: test@menu.ca')
    console.log('Password: TestAdmin123!')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createTestAdmin()
