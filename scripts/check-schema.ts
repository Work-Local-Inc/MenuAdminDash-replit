import { createClient } from '@supabase/supabase-js'

async function checkSchemas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  console.log('Testing with ANON key (menuca_v3 schema):')
  const anonClient = createClient(supabaseUrl, anonKey, {
    db: { schema: 'menuca_v3' }
  })

  let { data, error } = await anonClient.from('restaurants').select('id').limit(1)
  console.log('  restaurants:', error ? `ERROR: ${error.message}` : 'OK')

  ;({ data, error } = await anonClient.from('admin_users').select('id').limit(1))
  console.log('  admin_users:', error ? `ERROR: ${error.message}` : 'OK')

  console.log('\nTesting with SERVICE ROLE key (menuca_v3 schema):')
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'menuca_v3' }
  })

  ;({ data, error } = await serviceClient.from('restaurants').select('id').limit(1))
  console.log('  restaurants:', error ? `ERROR: ${error.message}` : 'OK')

  ;({ data, error } = await serviceClient.from('admin_users').select('id').limit(1))
  console.log('  admin_users:', error ? `ERROR: ${error.message}` : 'OK')

  console.log('\nTesting with SERVICE ROLE key (public schema):')
  const servicePublic = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'public' }
  })

  ;({ data, error} = await servicePublic.from('restaurants').select('id').limit(1))
  console.log('  restaurants:', error ? `ERROR: ${error.message}` : 'OK')

  ;({ data, error } = await servicePublic.from('admin_users').select('id').limit(1))
  console.log('  admin_users:', error ? `ERROR: ${error.message}` : 'OK')
}

checkSchemas()
