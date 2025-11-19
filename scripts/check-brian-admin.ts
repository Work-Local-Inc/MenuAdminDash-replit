import { createClient } from '@supabase/supabase-js'

async function checkBrian() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'menuca_v3' } }
  )

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', 'brian+1@worklocal.ca')
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Brian admin user:', data)
  }
}

checkBrian()
