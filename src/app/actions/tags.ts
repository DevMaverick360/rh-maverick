'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEditRhEvaluation, getPanelRoleForUser } from '@/lib/auth/panel-role'
import { slugifyTag } from '@/lib/slugify'

export type TagRow = {
  id: string
  name: string
  slug: string
  color: string | null
}

async function requireTagManager(supabase: Awaited<ReturnType<typeof createClient>>) {
  const role = await getPanelRoleForUser(supabase)
  if (!canEditRhEvaluation(role)) {
    return { ok: false as const, error: 'Apenas Admin ou RH podem gerir etiquetas.' }
  }
  return { ok: true as const }
}

export async function createTag(nameRaw: string, colorRaw?: string | null) {
  const supabase = await createClient()
  const gate = await requireTagManager(supabase)
  if (!gate.ok) return { error: gate.error }

  const name = nameRaw.trim()
  if (!name) return { error: 'Indique o nome da etiqueta.' }

  const slug = slugifyTag(name)
  const { data: clash } = await supabase.from('tags').select('id').eq('slug', slug).maybeSingle()
  if (clash?.id) {
    return { error: 'Já existe uma etiqueta com este nome (ou muito semelhante).' }
  }

  const color = colorRaw?.trim() || null
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, slug, color: color || null })
    .select('id, name, slug, color')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Não foi possível criar a etiqueta.' }
  }

  revalidatePath('/dashboard/tags')
  revalidatePath('/dashboard/candidates')
  revalidatePath('/dashboard/candidates/new')
  return { success: true as const, tag: data as TagRow }
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient()
  const gate = await requireTagManager(supabase)
  if (!gate.ok) return { error: gate.error }

  const id = tagId.trim()
  if (!id) return { error: 'Etiqueta inválida.' }

  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/tags')
  revalidatePath('/dashboard/candidates')
  return { success: true as const }
}

export async function updateTag(tagId: string, nameRaw: string, colorRaw?: string | null) {
  const supabase = await createClient()
  const gate = await requireTagManager(supabase)
  if (!gate.ok) return { error: gate.error }

  const id = tagId.trim()
  if (!id) return { error: 'Etiqueta inválida.' }

  const name = nameRaw.trim()
  if (!name) return { error: 'Indique o nome da etiqueta.' }

  const slug = slugifyTag(name)
  const { data: clash } = await supabase.from('tags').select('id').eq('slug', slug).neq('id', id).maybeSingle()
  if (clash?.id) {
    return { error: 'Já existe uma etiqueta com este nome (ou muito semelhante).' }
  }

  const color = colorRaw?.trim() || null
  const { data, error } = await supabase
    .from('tags')
    .update({ name, slug, color: color || null })
    .eq('id', id)
    .select('id, name, slug, color')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Não foi possível atualizar a etiqueta.' }
  }

  revalidatePath('/dashboard/tags')
  revalidatePath('/dashboard/candidates')
  revalidatePath('/dashboard/candidates/new')
  return { success: true as const, tag: data as TagRow }
}
