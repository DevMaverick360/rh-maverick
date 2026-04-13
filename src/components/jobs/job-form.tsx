'use client'

import { useState } from 'react'
import { createJob, updateJob } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft, Save, Briefcase, Code, Heart, FileText, Sparkles } from 'lucide-react'

interface JobFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    cultural_criteria: string;
    technical_criteria: string;
    application_code?: string | null;
  }
}

export function JobForm({ initialData }: JobFormProps) {
  const isEditing = !!initialData
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    let result
    if (isEditing) {
      result = await updateJob(initialData.id, formData)
    } else {
      result = await createJob(formData)
    }
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/jobs"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEditing ? 'Editar Vaga' : 'Nova Vaga'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing 
                ? 'Atualize os critérios desta vaga.' 
                : 'Defina o perfil ideal para a IA avaliar candidatos automaticamente.'}
            </p>
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Step 1 — Info Geral */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0B]">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Informações da Vaga</h3>
              <p className="text-xs text-muted-foreground">Dados básicos que serão exibidos aos candidatos.</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">Título da Vaga</Label>
              <Input
                id="title"
                name="title"
                defaultValue={initialData?.title}
                required
                placeholder="Ex: Senior Frontend Engineer"
                className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-[#0B0B0B]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application_code" className="text-sm font-semibold">
                Código da vaga (integrações)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Opcional. Use no Google Form ou API como <code className="rounded bg-muted px-1">job_code</code> em vez do UUID.
                Apenas letras minúsculas, números, hífen e sublinhado.
              </p>
              <Input
                id="application_code"
                name="application_code"
                defaultValue={initialData?.application_code ?? ''}
                placeholder="ex: frontend-sp-2025"
                pattern="[a-z0-9_-]*"
                className="h-11 rounded-lg border-border px-4 text-sm font-mono transition-colors focus:border-[#0B0B0B]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Descrição
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={initialData?.description}
                placeholder="Descreva as responsabilidades, o dia-a-dia, benefícios e requisitos gerais da vaga..."
                className="min-h-[120px] rounded-lg border-border px-4 py-3 text-sm resize-none transition-colors focus:border-[#0B0B0B]"
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Critérios IA */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066FF] to-[#0044CC]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Critérios para Análise da IA</h3>
              <p className="text-xs text-muted-foreground">A IA usará esses dados para pontuar cada candidato.</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="technical_criteria" className="text-sm font-semibold flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-[#0066FF]" />
                  Critérios Técnicos
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  Habilidades, tecnologias e experiências exigidas.
                </p>
                <Textarea
                  id="technical_criteria"
                  name="technical_criteria"
                  defaultValue={initialData?.technical_criteria}
                  required
                  placeholder={"- React.js avançado\n- TypeScript\n- Arquitetura de micro-frontends\n- Experiência com testes E2E\n- CI/CD"}
                  className="min-h-[180px] rounded-lg border-border px-4 py-3 text-sm resize-none transition-colors focus:border-[#0066FF] font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cultural_criteria" className="text-sm font-semibold flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-[#FF3B3B]" />
                  Critérios Culturais
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  Valores, comportamento e perfil comportamental.
                </p>
                <Textarea
                  id="cultural_criteria"
                  name="cultural_criteria"
                  defaultValue={initialData?.cultural_criteria}
                  required
                  placeholder={"- Proatividade e autonomia\n- Fit com trabalho assíncrono\n- Perfil hands-on\n- Boa comunicação escrita\n- Mentalidade de growth"}
                  className="min-h-[180px] rounded-lg border-border px-4 py-3 text-sm resize-none transition-colors focus:border-[#FF3B3B] font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20 shrink-0">
              <span className="text-destructive text-sm font-bold">!</span>
            </div>
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" className="rounded-lg font-semibold text-muted-foreground" asChild>
            <Link href="/dashboard/jobs">Cancelar</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="rounded-lg font-semibold h-11 px-8 text-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : isEditing ? 'Atualizar Vaga' : 'Publicar Vaga'}
          </Button>
        </div>
      </form>
    </div>
  )
}
