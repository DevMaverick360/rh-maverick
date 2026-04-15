import Link from 'next/link'
import { FileSpreadsheet } from 'lucide-react'
import { JobForm } from '@/components/jobs/job-form'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: job } = await supabase.from('jobs').select('title').eq('id', id).maybeSingle()
  return {
    title: job?.title ? `Editar: ${job.title}` : 'Editar vaga',
  }
}

export default async function EditJobPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      'id, title, description, cultural_criteria, technical_criteria, application_code, created_at'
    )
    .eq('id', id)
    .single()

  if (error || !job) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
        >
          Painel da vaga (candidatos)
        </Link>
        <Link
          href={`/dashboard/jobs/${job.id}/integracao`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#7C3AED] hover:underline"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Documentação Google Forms
        </Link>
      </div>
      <JobForm initialData={job} />
    </div>
  )
}
