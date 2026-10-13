export const instant = false
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const hasError = params?.message === 'auth-error'
  const inactive = params?.message === 'inactive'

  return <LoginForm hasError={hasError} inactive={inactive} />
}
