'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const email = formData.get('email') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as string
  const password = formData.get('password') as string

  // Since regular users can't create other users bypass email confirmation or set passwords easily 
  // without a service role, we use signUp. Note: This will NOT log the admin out if done correctly server-side.
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (signUpError) return { error: signUpError.message }

  // Update role immediately if successful, as trigger might default to admin
  if (data?.user) {
    await supabase
      .from('profiles')
      .update({ role })
      .eq('id', data.user.id)
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
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
