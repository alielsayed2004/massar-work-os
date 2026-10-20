'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashReviewToken, isTokenShaped } from '@/lib/review-link'
import { toCode } from '@/lib/labels'

/** The client's answer from a review link. All checks live in decide_by_review_link(). */
export async function decideByLink(formData: FormData) {
  const token = String(formData.get('token') || '')
  const decision = String(formData.get('decision') || '')
  const comment = String(formData.get('comment') || '')
  if (!isTokenShaped(token) || !['approved', 'changes_requested'].includes(decision)) redirect('/login')

  const back = `/r/${token}`
  let code: string | null = null
  try {
    const { error } = await createAdminClient().rpc('decide_by_review_link', {
      p_token_hash: hashReviewToken(token),
      p_decision: decision,
      p_comment: comment,
    })
    if (error) code = toCode(error)
  } catch (e) {
    code = toCode(e)
  }
  redirect(code ? `${back}?error=${code}` : `${back}?ok=${decision === 'approved' ? 'CLIENT_APPROVED' : 'CLIENT_CHANGES_SENT'}`)
}
