import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { rerunCandidateAiAnalysis } from '@/lib/cv/ingest-pipeline'

/**
 * Reexecuta análise de IA (critérios da vaga). Autenticação por cookie (sessão Supabase).
 * Usa API em vez de Server Action para evitar falhas RSC no Next 16 + Turbopack.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const result = await rerunCandidateAiAnalysis(supabase, candidateId.trim())
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
  const { data: jobRow } = await supabase.from('candidates').select('job_id').eq('id', candidateId.trim()).maybeSingle()
  if (jobRow?.job_id) {
    revalidatePath(`/dashboard/jobs/${jobRow.job_id}`)
  }
  return NextResponse.json({ ok: true as const })
}
