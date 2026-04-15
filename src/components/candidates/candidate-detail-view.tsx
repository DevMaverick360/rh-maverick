import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Pencil,
  Sparkles,
  ClipboardList,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CandidateAiRerunButton } from '@/components/candidates/candidate-ai-rerun-button'

export type CandidateDetailJob = {
  id: string
  title: string
  description: string | null
  cultural_criteria: string | null
  technical_criteria: string | null
} | null

export type CandidateDetailData = {
  id: string
  name: string
  email: string
  phone: string | null
  cv_url: string | null
  job_id: string | null
  status: 'pending' | 'approved' | 'rejected'
  cultural_score: number | null
  technical_score: number | null
  ai_summary: string | null
  form_responses: unknown
  created_at: string
  jobs: CandidateDetailJob
}

function normalizeFormResponses(raw: unknown): { question: string; answer: string }[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
    }))
    .filter((row) => row.question.trim() || row.answer.trim())
}

function statusBadge(status: CandidateDetailData['status']) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 font-semibold text-xs">
          Aprovado
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/20 font-semibold text-xs">
          Rejeitado
        </Badge>
      )
    default:
      return (
        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 font-semibold text-xs">
          Pendente
        </Badge>
      )
  }
}

function scoreTone(score: number | null) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 80) return 'text-[#22C55E]'
  if (score >= 60) return 'text-[#F59E0B]'
  return 'text-[#FF3B3B]'
}

function ScoreBlock({ label, score }: { label: string; score: number | null }) {
  const pct = score ?? 0
  const has = score != null
  return (
    <div className="rounded-xl border border-border/60 bg-[#FAFAFA] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${scoreTone(score)}`}>{has ? `${score}%` : '—'}</p>
      {has && (
        <div className="mt-3 h-2 rounded-full bg-border/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0B0B0B]"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function CandidateDetailView({ candidate }: { candidate: CandidateDetailData }) {
  const rows = normalizeFormResponses(candidate.form_responses)
  const created = new Date(candidate.created_at)
  const createdLabel = created.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const aiPending =
    candidate.status === 'pending' &&
    candidate.technical_score == null &&
    candidate.cultural_score == null &&
    !candidate.ai_summary

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/candidates"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{candidate.name}</h1>
              {statusBadge(candidate.status)}
              {rows.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-semibold border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5"
                >
                  Formulário
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Candidatura em {createdLabel}
            </p>
          </div>
        </div>
        <Button className="h-10 rounded-lg font-semibold shrink-0" variant="outline" asChild>
          <Link href={`/dashboard/candidates/${candidate.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border border-border/60 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0B]">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold">Contacto e vaga</h2>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-1">E-mail</p>
              <a href={`mailto:${candidate.email}`} className="text-[#7C3AED] font-medium hover:underline break-all">
                {candidate.email}
              </a>
            </div>
            {candidate.phone && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Telefone
                </p>
                <p className="font-medium">{candidate.phone}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-1 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Vaga
              </p>
              {candidate.jobs ? (
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">{candidate.jobs.title}</span>
                  <Button variant="link" className="h-auto p-0 text-xs text-[#7C3AED] justify-start" asChild>
                    <Link href={`/dashboard/jobs/${candidate.jobs.id}/edit`}>Abrir vaga no painel</Link>
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground">Sem vaga associada</span>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-2">Currículo</p>
              {candidate.cv_url ? (
                <Button variant="outline" size="sm" className="rounded-lg font-semibold" asChild>
                  <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Abrir ficheiro
                    <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-70" />
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">Sem ficheiro anexado nesta candidatura.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3 border border-border/60 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/15">
                <Sparkles className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Análise da IA</h2>
                <p className="text-xs text-muted-foreground">Critérios da vaga vs. CV e respostas do formulário.</p>
              </div>
            </div>
            <CandidateAiRerunButton
              candidateId={candidate.id}
              disabled={!candidate.job_id}
            />
          </div>
          <div className="p-5 space-y-5">
            {aiPending && (
              <p className="text-sm text-amber-900 dark:text-amber-200/90 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
                A análise automática ainda não concluiu ou está em fila. Aguarde alguns segundos e atualize a página.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <ScoreBlock label="Score técnico" score={candidate.technical_score} />
              <ScoreBlock label="Score cultural" score={candidate.cultural_score} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] mb-2">Resumo</p>
              {candidate.ai_summary ? (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{candidate.ai_summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {aiPending
                    ? 'O resumo será gerado após o processamento.'
                    : 'Sem resumo guardado para este candidato.'}
                </p>
              )}
            </div>
            {candidate.jobs &&
              (candidate.jobs.cultural_criteria?.trim() || candidate.jobs.technical_criteria?.trim()) && (
                <details className="rounded-lg border border-border/50 bg-[#FAFAFA] px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-foreground/90">
                    Critérios da vaga usados na análise
                  </summary>
                  <div className="mt-3 space-y-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
                    {candidate.jobs.cultural_criteria?.trim() && (
                      <div>
                        <p className="font-bold text-[#4F4F4F] mb-1">Culturais</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{candidate.jobs.cultural_criteria}</p>
                      </div>
                    )}
                    {candidate.jobs.technical_criteria?.trim() && (
                      <div>
                        <p className="font-bold text-[#4F4F4F] mb-1">Técnicos</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{candidate.jobs.technical_criteria}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
          </div>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card className="border border-border/60 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0B]">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold">Respostas do formulário</h2>
          </div>
          <div className="divide-y divide-border/40">
            {rows.map((row, i) => (
              <div key={i} className="px-5 py-4 grid gap-1 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] sm:gap-6">
                <p className="text-xs font-semibold text-[#4F4F4F]">{row.question || '—'}</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{row.answer || '—'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
