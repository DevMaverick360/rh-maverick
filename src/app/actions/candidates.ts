'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rerunCandidateAiAnalysis } from '@/lib/cv/ingest-pipeline'

export async function createCandidate(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const jobId = formData.get('job_id') as string
  const cvFile = formData.get('cv') as File | null

  let cvUrl: string | null = null

  // Upload CV if provided
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

    const { data: urlData } = supabase.storage
      .from('cvs')
      .getPublicUrl(filePath)

    cvUrl = urlData.publicUrl
  }

  const { error } = await supabase.from('candidates').insert({
    name,
    email,
    phone: phone || null,
    job_id: jobId || null,
    cv_url: cvUrl,
    status: 'pending',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/candidates')
  redirect('/dashboard/candidates')
}

export async function updateCandidate(id: string, formData: FormData) {
  const supabase = await createClient()

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

  // Upload new CV if provided
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

    const { data: urlData } = supabase.storage
      .from('cvs')
      .getPublicUrl(filePath)

    data.cv_url = urlData.publicUrl
  }

  const { error } = await supabase
    .from('candidates')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/candidates')
  redirect('/dashboard/candidates')
}

/** Reexecuta análise de IA com critérios atuais da vaga; não envia e-mail ao candidato. */
export async function rerunCandidateAiAnalysisAction(
  candidateId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado.' }
  }

  const result = await rerunCandidateAiAnalysis(supabase, candidateId)
  if ('error' in result) {
    return result
  }

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
  return { ok: true }
}

export async function deleteCandidate(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/candidates')
}
