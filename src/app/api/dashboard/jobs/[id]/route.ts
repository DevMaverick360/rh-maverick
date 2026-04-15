import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { jobPayloadFromFormData } from '@/lib/jobs/job-payload'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID da vaga ausente.' }, { status: 400 })
  }

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

  const { error } = await supabase
    .from('jobs')
    .update(jobPayloadFromFormData(formData))
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  revalidatePath('/dashboard/jobs')
  return NextResponse.json({ success: true })
}
