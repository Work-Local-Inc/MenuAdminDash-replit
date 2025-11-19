import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoAdmin() {
  console.log('Creating demo admin user...');
  
  try {
    // Create auth user  
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@menu.ca',
      password: 'Demo123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ Admin user already exists!');
        console.log('\nLogin credentials:');
        console.log('Email: admin@menu.ca');
        console.log('Password: Demo123!');
        return;
      }
      throw authError;
    }

    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@menu.ca');
    console.log('Password: Demo123!');
    console.log('\nUser ID:', authData.user.id);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDemoAdmin();
