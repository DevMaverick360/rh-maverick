'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createPanelUser } from '@/lib/users/create-panel-user'

// ── Profile ──
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado.' }

  const fullName = formData.get('full_name') as string

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const newPassword = formData.get('new_password') as string

  if (!newPassword || newPassword.length < 6) {
    return { error: 'A senha deve ter no mínimo 6 caracteres.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }

  return { success: true }
}

// ── Users ──
export async function listUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient()

  // Validate role
  if (!['admin', 'rh', 'visualizador'].includes(role)) {
    return { error: 'Papel inválido.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function createUser(formData: FormData) {
  const supabase = await createClient()
  const admin = createServiceRoleClient()
  if (!admin) {
    return {
      error:
        'Defina SUPABASE_SERVICE_ROLE_KEY no servidor (variável de ambiente) para criar utilizadores pelo painel.',
    }
  }

  const {
    data: { user: caller },
  } = await supabase.auth.getUser()
  if (!caller) {
    return { error: 'Não autenticado.' }
  }

  const emailRaw = formData.get('email')
  const fullNameRaw = formData.get('full_name')
  const roleRaw = formData.get('role')
  const passwordRaw = formData.get('password')

  const result = await createPanelUser(supabase, admin, caller, {
    email: typeof emailRaw === 'string' ? emailRaw : '',
    fullName: typeof fullNameRaw === 'string' ? fullNameRaw : '',
    role: typeof roleRaw === 'string' ? roleRaw : '',
    password: typeof passwordRaw === 'string' ? passwordRaw : '',
  })

  if ('error' in result) {
    return result
  }

  revalidatePath('/dashboard/settings')
  return { success: true as const }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── AI Settings ──
export async function getAISettings() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) return { error: error.message, data: null }
  return { data }
}

export async function updateAISettings(formData: FormData) {
  const supabase = await createClient()

  const systemPrompt = formData.get('system_prompt') as string
  const model = formData.get('model') as string
  const temperature = parseFloat(formData.get('temperature') as string)

  // Get the existing settings row ID
  const { data: existing } = await supabase
    .from('ai_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    // Create if missing
    const { error } = await supabase.from('ai_settings').insert({
      system_prompt: systemPrompt,
      model,
      temperature,
    })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('ai_settings')
      .update({
        system_prompt: systemPrompt,
        model,
        temperature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
