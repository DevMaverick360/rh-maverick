import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { JobGoogleFormsIntegration } from '@/components/jobs/job-google-forms-integration'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('title').eq('id', id).maybeSingle()
  const title = data?.title ?? 'Vaga'
  return {
    title: `Integração Google Forms — ${title}`,
    description: 'Script pronto para enviar respostas do formulário para o Maverick 360.',
  }
}

export default async function JobIntegracaoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, title, application_code')
    .eq('id', id)
    .maybeSingle()

  if (error || !job) {
    notFound()
  }

  return (
    <JobGoogleFormsIntegration
      job={{
        id: job.id,
        title: job.title ?? 'Vaga',
        application_code: job.application_code,
      }}
    />
  )
}
