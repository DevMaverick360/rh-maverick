import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  CandidateDetailView,
  type CandidateDetailData,
} from '@/components/candidates/candidate-detail-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase.from('candidates').select('name').eq('id', id).maybeSingle()
  return {
    title: row?.name ? `${row.name} · Candidato` : 'Candidato',
  }
}

export default async function CandidateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('candidates')
    .select(
      `
      id,
      name,
      email,
      phone,
      cv_url,
      job_id,
      status,
      cultural_score,
      technical_score,
      ai_summary,
      form_responses,
      created_at,
      jobs (
        id,
        title,
        description,
        cultural_criteria,
        technical_criteria
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    notFound()
  }

  const candidate = row as unknown as CandidateDetailData

  return <CandidateDetailView candidate={candidate} />
}
