import { createClient } from '@supabase/supabase-js'

async function checkUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check brian+1's Supabase Auth user
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error:', error)
  } else {
    const brian = users.find(u => u.email === 'brian+1@worklocal.ca')
    console.log('Brian Supabase user:', JSON.stringify(brian, null, 2))
  }
}

checkUser()
