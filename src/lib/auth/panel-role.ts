import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/** Papéis definidos em `profiles.role` (migração settings). */
export type PanelRole = 'admin' | 'rh' | 'visualizador'

export function canEditRhEvaluation(role: string | null | undefined): role is 'admin' | 'rh' {
  return role === 'admin' || role === 'rh'
}

/** Lê o papel a partir de um cliente Supabase já ligado à sessão (server actions, rotas). */
export async function getPanelRoleForUser(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role ?? null
}

/** Lê o papel do utilizador autenticado no painel. */
export async function getPanelRole(): Promise<string | null> {
  const supabase = await createClient()
  return getPanelRoleForUser(supabase)
}
