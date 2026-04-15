import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { jobPayloadFromFormData } from '@/lib/jobs/job-payload'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('jobs')
    .insert(jobPayloadFromFormData(formData))
    .select('id')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao criar vaga.' }, { status: 400 })
  }

  revalidatePath('/dashboard/jobs')
  return NextResponse.json({ success: true, id: row.id })
}
