import { createAdminClient } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/site'

type Role = 'admin' | 'manager' | 'member'

/**
 * Sends a Supabase invite and sets role / team with the service
 * key (app_metadata), so nobody can choose their own role at sign-up.
 * Callers must check that the actor is a partner (admin) BEFORE calling this.
 * Returns an error code, or null on success.
 */
export async function inviteAccount(input: {
  email: string
  fullName: string
  role: Role
  teamId?: string | null
  whatsapp?: string | null
}): Promise<string | null> {
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return 'MISSING_SERVICE_ROLE_KEY'
  }

  // The email's link opens our set-password page; the person picks their own password
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
    redirectTo: `${await siteOrigin()}/auth/set-password`,
  })
  // Already has an account (e.g. invited before): a fresh sign-in link is the fix
  if (error && (error as { code?: string }).code === 'email_exists') return 'EMAIL_EXISTS'
  if (error || !data?.user) return 'INVITE_FAILED'

  const { error: metaErr } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: input.role, client_id: null },
  })
  if (metaErr) return 'INVITE_FAILED'

  // The trigger already created a locked-down profile; set the real values.
  const { error: profErr } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: input.fullName,
    role: input.role,
    status: 'active',
    team_id: input.teamId || null,
    whatsapp_phone: input.whatsapp || null,
  })
  if (profErr) return 'INVITE_FAILED'
  return null
}
