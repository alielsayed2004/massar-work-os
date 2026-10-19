import { NextRequest, NextResponse } from 'next/server'
import { DEV_AUTH_ENABLED, DEV_COOKIE_OPTIONS, DEV_SESSION_COOKIE, homeFor, toDevRole } from '@/lib/dev-session'

export async function GET(request: NextRequest) {
  if (!DEV_AUTH_ENABLED) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const role = toDevRole(new URL(request.url).searchParams.get('role'))
  const response = NextResponse.redirect(new URL(homeFor(role), request.url))
  response.cookies.set(DEV_SESSION_COOKIE, role, DEV_COOKIE_OPTIONS)
  return response
}
