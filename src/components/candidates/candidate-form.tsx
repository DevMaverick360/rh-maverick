'use client'

import { useState, useRef, useCallback } from 'react'
import { createCandidate, updateCandidate } from '@/app/actions/candidates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  ArrowLeft,
  UserPlus,
  Save,
  User,
  Mail,
  Phone,
  Upload,
  FileText,
  X,
  Briefcase,
  ClipboardList,
} from 'lucide-react'

type FormResponseRow = { question: string; answer: string }

function normalizeFormResponses(raw: unknown): FormResponseRow[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
    }))
    .filter((row) => row.question.trim() || row.answer.trim())
}

interface CandidateFormProps {
  jobs: { id: string; title: string }[]
  initialData?: {
    id: string
    name: string
    email: string
    phone: string | null
    job_id: string | null
    cv_url: string | null
    form_responses?: unknown
  }
}

export function CandidateForm({ jobs, initialData }: CandidateFormProps) {
  const isEditing = !!initialData
  const formResponseRows = isEditing ? normalizeFormResponses(initialData?.form_responses) : []
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    if (file) {
      formData.set('cv', file)
    }

    let result
    if (isEditing) {
      result = await updateCandidate(initialData.id, formData)
    } else {
      result = await createCandidate(formData)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/candidates"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Editar Candidato' : 'Novo Candidato'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? 'Atualize as informações do candidato.'
              : 'Cadastre manualmente um candidato e faça upload do currículo.'}
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Section 1 — Dados Pessoais */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0B]">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Dados Pessoais</h3>
              <p className="text-xs text-muted-foreground">Informações de contato do candidato.</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Nome completo
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={initialData?.name}
                  placeholder="João da Silva"
                  className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-[#0B0B0B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={initialData?.email}
                  placeholder="joao@email.com"
                  className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-[#0B0B0B]"
                />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Telefone
                  <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={initialData?.phone || ''}
                  placeholder="(11) 99999-9999"
                  className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-[#0B0B0B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_id" className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Vaga
                  <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <select
                  id="job_id"
                  name="job_id"
                  defaultValue={initialData?.job_id || ''}
                  className="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm ring-offset-background focus:border-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
                >
                  <option value="">Sem vaga específica</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Respostas de formulário externo (Google Forms, etc.) */}
        {formResponseRows.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Respostas do formulário</h3>
                <p className="text-xs text-muted-foreground">
                  Pergunta (título) e resposta enviadas pela integração — somente leitura.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-5 max-h-[480px] overflow-y-auto">
              {formResponseRows.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/50 bg-[#FAFAFA]/80 px-4 py-3 space-y-2"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Pergunta {idx + 1}
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{row.question}</p>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
                    Resposta
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                    {row.answer || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2 — Upload CV */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066FF] to-[#0044CC]">
              <Upload className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Currículo (CV)</h3>
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Faça upload de um novo CV para substituir o atual.'
                  : 'Faça upload do arquivo para análise automática pela IA.'}
              </p>
            </div>
          </div>
          <div className="p-6">
            {/* Show current CV if editing */}
            {isEditing && initialData?.cv_url && !file && (
              <div className="flex items-center gap-4 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E]/10 shrink-0">
                  <FileText className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">CV atual anexado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faça upload de um novo arquivo abaixo para substituir.
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              name="cv"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
              id="cv-upload"
            />

            {!file ? (
              <label
                htmlFor="cv-upload"
                className={`
                  flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-6 cursor-pointer transition-all duration-200
                  ${dragActive
                    ? 'border-[#0066FF] bg-[#0066FF]/5'
                    : 'border-border/60 hover:border-[#0066FF]/50 hover:bg-[#F5F5F5]/50'
                  }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F5] mb-4">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold mb-1">
                  Arraste o arquivo ou <span className="text-[#0066FF]">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC ou DOCX — máximo 10MB
                </p>
              </label>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-[#FAFAFA] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0066FF]/10 shrink-0">
                  <FileText className="h-5 w-5 text-[#0066FF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(file.size)} — Pronto para envio
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            )}
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
            <Link href="/dashboard/candidates">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="rounded-lg font-semibold h-11 px-8 text-sm"
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Cadastrando...' : 'Cadastrar Candidato'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
