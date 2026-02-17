'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log(`[Login] Attempting login for: ${email}`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error(`[Login] FAILED for ${email}:`, error.message)
    return { error: error.message }
  }

  console.log(`[Login] SUCCESS for ${email}, user_id: ${data.user?.id}`)
  console.log(`[Login] Session created: ${!!data.session}, expires: ${data.session?.expires_at}`)

  revalidatePath('/', 'layout')
  redirect('/admin/dashboard')
}
