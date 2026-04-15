'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { jobPayloadFromFormData } from '@/lib/jobs/job-payload'

export type JobFormState = { error: string } | { success: true } | null

/** Preferir `POST /api/dashboard/jobs` a partir do cliente (evita bug de Server Actions + Turbopack). */
export async function createJob(formData: FormData): Promise<JobFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase.from('jobs').insert(jobPayloadFromFormData(formData))

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/jobs')
  return { success: true }
}

export async function updateJob(id: string, formData: FormData): Promise<JobFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase
    .from('jobs')
    .update(jobPayloadFromFormData(formData))
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/jobs')
  return { success: true }
}

export async function updateJobForm(formData: FormData): Promise<JobFormState> {
  const id = String(formData.get('job_id') ?? '').trim()
  if (!id) {
    return { error: 'ID da vaga ausente.' }
  }
  return updateJob(id, formData)
}

export async function deleteJob(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/jobs')
}
