'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function parseApplicationCode(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return s || null
}

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    cultural_criteria: formData.get('cultural_criteria') as string,
    technical_criteria: formData.get('technical_criteria') as string,
    application_code: parseApplicationCode(formData.get('application_code')),
  }

  const { error } = await supabase.from('jobs').insert(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/jobs')
  redirect('/dashboard/jobs')
}

export async function updateJob(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    cultural_criteria: formData.get('cultural_criteria') as string,
    technical_criteria: formData.get('technical_criteria') as string,
    application_code: parseApplicationCode(formData.get('application_code')),
  }

  const { error } = await supabase
    .from('jobs')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/jobs')
  redirect('/dashboard/jobs')
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
