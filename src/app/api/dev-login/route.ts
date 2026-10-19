import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || 'admin'
  const redirectPath = role === 'client' ? '/client-portal?welcome=1' : '/crm'

  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  response.cookies.set('massar_dev_session', role, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  })

  return response
}
