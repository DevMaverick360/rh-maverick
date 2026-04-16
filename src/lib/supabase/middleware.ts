import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname === '/'
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  /**
   * Só redirecionar para o login em navegação GET/HEAD.
   * Um POST ao dashboard (Server Actions, formulários, etc.) não pode receber 302 HTML —
   * o cliente Next espera o formato de resposta da action e falha com
   * "An unexpected response was received from the server".
   * O header `next-action` também não é fiável entre versões do Next.
   */
  const isDocumentNavigation =
    request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS'

  // Redirect users to dashboard if they are logged in and trying to access auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect users to login if they are NOT logged in and trying to access a protected route
  if (!user && isDashboardRoute && isDocumentNavigation) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
