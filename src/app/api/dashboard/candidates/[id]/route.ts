import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Exclui candidato. API em vez de Server Action (Next 16 + Turbopack).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params
  if (!candidateId?.trim()) {
    return NextResponse.json({ error: 'ID do candidato ausente.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { data: row } = await supabase.from('candidates').select('job_id').eq('id', candidateId.trim()).maybeSingle()

  const { error } = await supabase.from('candidates').delete().eq('id', candidateId.trim())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  revalidatePath('/dashboard/candidates')
  revalidatePath(`/dashboard/candidates/${candidateId}`)
  if (row?.job_id) {
    revalidatePath(`/dashboard/jobs/${row.job_id}`)
  }
  return NextResponse.json({ ok: true as const })
}
