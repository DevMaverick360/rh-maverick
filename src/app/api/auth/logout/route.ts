import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Logout com cookies aplicados na resposta (padrão Supabase + App Router).
 * Server Actions costumam falhar a limpar sessão; navegação completa ou POST aqui funciona.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  let response = NextResponse.redirect(new URL('/', origin), 303)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signOut()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return response
}

/** Permite link direto / bookmark (mesmo risco CSRF que muitos sites aceitam no logout). */
export async function GET(request: NextRequest) {
  return POST(request)
}
