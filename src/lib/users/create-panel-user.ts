import type { SupabaseClient, User } from '@supabase/supabase-js'

export type PanelNewUserInput = {
  email: string
  fullName: string
  role: string
  password: string
}

export type PanelNewUserResult = { success: true } | { error: string }

/**
 * Cria utilizador Auth + perfil (admin no painel). Usa service role para admin.createUser.
 * Chamável a partir de Route Handler (JSON) ou Server Action.
 */
export async function createPanelUser(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  caller: User,
  input: PanelNewUserInput
): Promise<PanelNewUserResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const role = input.role.trim()
  const password = input.password

  if (!email || !fullName || !password) {
    return { error: 'Preencha nome, e-mail e senha.' }
  }
  if (password.length < 6) {
    return { error: 'A senha deve ter no mínimo 6 caracteres.' }
  }
  if (!['admin', 'rh', 'visualizador'].includes(role)) {
    return { error: 'Papel inválido.' }
  }

  const { data: callerProfile, error: callerProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (callerProfileError) {
    return { error: `Não foi possível ler o perfil: ${callerProfileError.message}` }
  }

  let callerRole = callerProfile?.role ?? null
  if (!callerRole) {
    const { data: rowSr } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle()
    callerRole = rowSr?.role ?? null
  }

  if (!callerRole) {
    const { count, error: countErr } = await admin.from('profiles').select('*', { count: 'exact', head: true })
    if (countErr) {
      return { error: `Não foi possível verificar profiles: ${countErr.message}` }
    }
    if (count === 0) {
      const meta = caller.user_metadata as { full_name?: string; name?: string } | undefined
      const nm = (meta?.full_name || meta?.name || caller.email?.split('@')[0] || 'Administrador').slice(0, 200)
      const { error: bootErr } = await admin.from('profiles').upsert(
        {
          id: caller.id,
          full_name: nm,
          role: 'admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (bootErr) {
        return { error: `Primeiro arranque: falhou ao criar o seu perfil: ${bootErr.message}` }
      }
      callerRole = 'admin'
    } else {
      return {
        error:
          'O seu utilizador não tem linha na tabela profiles (Auth existe, perfil em falta). Peça a corrigir no Supabase ou volte a registar-se.',
      }
    }
  }

  if (callerRole !== 'admin') {
    return { error: 'Apenas administradores podem criar utilizadores.' }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) {
    return { error: createError.message }
  }
  if (!created?.user?.id) {
    return { error: 'Não foi possível criar o utilizador.' }
  }

  const userId = created.user.id

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return {
      error:
        profileError.message ||
        'Conta criada no Auth, mas falhou ao guardar o perfil. Verifique o registo em Supabase.',
    }
  }

  return { success: true }
}
