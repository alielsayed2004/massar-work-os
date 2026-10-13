'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error || !authData.user) {
    redirect('/login?message=auth-error')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  revalidatePath('/', 'layout')
  if (profile?.role === 'client') {
    redirect('/client-portal?welcome=1')
  } else {
    redirect('/my-work?welcome=1')
  }
}
