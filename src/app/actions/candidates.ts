'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEditRhEvaluation, getPanelRoleForUser } from '@/lib/auth/panel-role'
function parseOptionalScore(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '') return null
  const n = Number.parseInt(s, 10)
  if (Number.isNaN(n)) return null
  return Math.min(100, Math.max(0, n))
}

function parseRhNotes(raw: FormDataEntryValue | null): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  return t === '' ? null : t
}

async function syncCandidateTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidateId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const tagIds = [
    ...new Set(
      formData
        .getAll('tag_id')
        .map((v) => String(v).trim())
        .filter((id) => id.length > 0)
    ),
  ]

  const { error: delErr } = await supabase.from('candidate_tags').delete().eq('candidate_id', candidateId)
  if (delErr) return { error: delErr.message }

  if (tagIds.length === 0) return {}

  const rows = tagIds.map((tag_id) => ({ candidate_id: candidateId, tag_id }))
  const { error: insErr } = await supabase.from('candidate_tags').insert(rows)
  if (insErr) return { error: insErr.message }
  return {}
}

export async function createCandidate(formData: FormData) {
  const supabase = await createClient()
  const panelRole = await getPanelRoleForUser(supabase)
  const rhEditable = canEditRhEvaluation(panelRole)

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const jobId = formData.get('job_id') as string
  const cvFile = formData.get('cv') as File | null

  let cvUrl: string | null = null

  if (cvFile && cvFile.size > 0) {
    const fileExt = cvFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `cvs/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(filePath, cvFile, {
        contentType: cvFile.type,
        upsert: false,
      })

    if (uploadError) {
      return { error: `Erro no upload: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(filePath)

    cvUrl = urlData.publicUrl
  }

  const insertRow: Record<string, unknown> = {
    name,
    email,
    phone: phone || null,
    job_id: jobId || null,
    cv_url: cvUrl,
    status: 'pending',
  }
  if (rhEditable) {
    insertRow.rh_notes = parseRhNotes(formData.get('rh_notes'))
    insertRow.rh_technical_score = parseOptionalScore(formData.get('rh_technical_score'))
    insertRow.rh_cultural_score = parseOptionalScore(formData.get('rh_cultural_score'))
  }

  const { data: inserted, error } = await supabase.from('candidates').insert(insertRow).select('id').single()

  if (error || !inserted?.id) {
    return { error: error?.message ?? 'Falha ao criar candidato' }
  }

  if (rhEditable) {
    const tagErr = await syncCandidateTags(supabase, inserted.id, formData)
    if (tagErr.error) return { error: tagErr.error }
  }

  revalidatePath('/dashboard/candidates')
  return { success: true as const }
}

export async function updateCandidate(id: string, formData: FormData) {
  const supabase = await createClient()
  const panelRole = await getPanelRoleForUser(supabase)
  const rhEditable = canEditRhEvaluation(panelRole)

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const jobId = formData.get('job_id') as string
  const cvFile = formData.get('cv') as File | null

  const data: Record<string, unknown> = {
    name,
    email,
    phone: phone || null,
    job_id: jobId || null,
  }
  if (rhEditable) {
    data.rh_notes = parseRhNotes(formData.get('rh_notes'))
    data.rh_technical_score = parseOptionalScore(formData.get('rh_technical_score'))
    data.rh_cultural_score = parseOptionalScore(formData.get('rh_cultural_score'))
  }

  if (cvFile && cvFile.size > 0) {
    const fileExt = cvFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `cvs/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(filePath, cvFile, {
        contentType: cvFile.type,
        upsert: false,
      })

    if (uploadError) {
      return { error: `Erro no upload: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(filePath)

    data.cv_url = urlData.publicUrl
  }

  const { error } = await supabase.from('candidates').update(data).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  if (rhEditable) {
    const tagErr = await syncCandidateTags(supabase, id, formData)
    if (tagErr.error) return { error: tagErr.error }
  }

  revalidatePath('/dashboard/candidates')
  revalidatePath(`/dashboard/candidates/${id}`)
  revalidatePath(`/dashboard/candidates/${id}/edit`)
  return { success: true as const }
}
