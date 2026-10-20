export const instant = false
import LoginForm from './LoginForm'
import { DEV_AUTH_ENABLED } from '@/lib/dev-session'

// Runs while the HTML is parsed, before the first paint: the intro plays once
// per browser session (never over an error message), and repeat visits
// never see it flash.
const INTRO_GATE = `try{var k='massar_intro_seen',d=document.documentElement;d.dataset.intro=sessionStorage.getItem(k)||location.search.indexOf('message=')>-1?'skip':'play';sessionStorage.setItem(k,'1')}catch(e){document.documentElement.dataset.intro='skip'}`

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const hasError = params?.message === 'auth-error'
  const inactive = params?.message === 'inactive'

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      <LoginForm hasError={hasError} inactive={inactive} devAuth={DEV_AUTH_ENABLED} />
    </>
  )
}
