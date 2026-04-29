import Link from 'next/link'
import { ArrowLeft, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { canEditRhEvaluation, getPanelRole } from '@/lib/auth/panel-role'
import { TagsCatalogClient } from '@/components/tags/tags-catalog-client'
import type { TagRow } from '@/app/actions/tags'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Etiquetas · Maverick',
}

export default async function TagsPage() {
  const supabase = await createClient()
  const { data: tags, error } = await supabase.from('tags').select('id, name, slug, color').order('name', { ascending: true })

  const panelRole = await getPanelRole()
  const canManage = canEditRhEvaluation(panelRole)

  if (error) {
    console.error('tags list', error)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F766E]/15">
                <Tag className="h-4 w-4 text-[#0F766E]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Etiquetas</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre etiquetas para depois associar a candidatos (filtros, kanban, etc.).
              {!canManage && ' O seu perfil é só leitura — apenas Admin ou RH podem criar ou eliminar.'}
            </p>
          </div>
        </div>
      </div>

      <TagsCatalogClient initialTags={(tags ?? []) as TagRow[]} canManage={canManage} />
    </div>
  )
}
