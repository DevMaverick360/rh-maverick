import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createPanelUser } from '@/lib/users/create-panel-user'

export async function POST(req: Request) {
  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'Defina SUPABASE_SERVICE_ROLE_KEY no servidor (variável de ambiente) para criar utilizadores pelo painel.',
      },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user: caller },
  } = await supabase.auth.getUser()
  if (!caller) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const result = await createPanelUser(supabase, admin, caller, {
    email,
    fullName,
    role,
    password,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/dashboard/settings')
  return NextResponse.json({ success: true })
}
