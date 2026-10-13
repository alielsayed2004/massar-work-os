import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// The header's "تسجيل الخروج" form posts here. This route was missing (→ 404).
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
