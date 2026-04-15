import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileSpreadsheet,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { CandidateDeleteButton } from '@/components/candidates/candidate-delete-button'

type CandidateStatus = 'pending' | 'approved' | 'rejected'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}

function parseStatusFilter(raw: string | undefined): CandidateStatus | 'all' {
  const s = raw?.toLowerCase().trim()
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s
  return 'all'
}

function statusBadge(status: string) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-[#22C55E]/10 text-[#15803D] border-[#22C55E]/25 font-semibold text-xs">
          Aprovado
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-[#FF3B3B]/10 text-[#B91C1C] border-[#FF3B3B]/25 font-semibold text-xs">
          Rejeitado
        </Badge>
      )
    default:
      return (
        <Badge className="bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/25 font-semibold text-xs">
          Pendente
        </Badge>
      )
  }
}

function scoreColor(score: number | null) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 80) return 'text-[#15803D]'
  if (score >= 60) return 'text-[#B45309]'
  return 'text-[#B91C1C]'
}

const FILTER_PALETTE: Record<
  CandidateStatus | 'all',
  { activeBorder: string; activeBg: string; activeRing: string; iconBg: string; iconText: string; idleHover: string }
> = {
  all: {
    activeBorder: 'border-foreground/25',
    activeBg: 'bg-[#0B0B0B]/[0.03]',
    activeRing: 'ring-1 ring-foreground/15',
    iconBg: 'bg-foreground/10',
    iconText: 'text-foreground',
    idleHover: 'hover:border-foreground/20',
  },
  pending: {
    activeBorder: 'border-amber-500/50',
    activeBg: 'bg-amber-500/[0.07]',
    activeRing: 'ring-1 ring-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-700',
    idleHover: 'hover:border-amber-500/35',
  },
  approved: {
    activeBorder: 'border-emerald-500/50',
    activeBg: 'bg-emerald-500/[0.07]',
    activeRing: 'ring-1 ring-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-700',
    idleHover: 'hover:border-emerald-500/35',
  },
  rejected: {
    activeBorder: 'border-red-500/45',
    activeBg: 'bg-red-500/[0.06]',
    activeRing: 'ring-1 ring-red-500/25',
    iconBg: 'bg-red-500/12',
    iconText: 'text-red-700',
    idleHover: 'hover:border-red-400/40',
  },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: job } = await supabase.from('jobs').select('title').eq('id', id).maybeSingle()
  return {
    title: job?.title ? `Vaga: ${job.title}` : 'Painel da vaga',
  }
}

export default async function JobDashboardPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const statusFilter = parseStatusFilter(sp.status)

  const supabase = await createClient()

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, title, description, cultural_criteria, technical_criteria, application_code, created_at')
    .eq('id', id)
    .maybeSingle()

  if (jobError || !job) {
    notFound()
  }

  const jobId = job.id

  const [totalRes, pendingRes, approvedRes, rejectedRes, candidatesRes] = await Promise.all([
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'pending'),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'approved'),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'rejected'),
    (() => {
      let q = supabase
        .from('candidates')
        .select('id, name, email, phone, status, cultural_score, technical_score, ai_summary, created_at, form_responses')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }
      return q
    })(),
  ])

  const total = totalRes.count ?? 0
  const pending = pendingRes.count ?? 0
  const approved = approvedRes.count ?? 0
  const rejected = rejectedRes.count ?? 0
  const candidates = candidatesRes.data ?? []
  if (candidatesRes.error) {
    console.error('Error fetching candidates for job', candidatesRes.error)
  }

  const filterItems: { key: CandidateStatus | 'all'; label: string; count: number; icon: LucideIcon }[] = [
    { key: 'all', label: 'Todos', count: total, icon: Users },
    { key: 'pending', label: 'Pendentes', count: pending, icon: Clock },
    { key: 'approved', label: 'Aprovados', count: approved, icon: CheckCircle2 },
    { key: 'rejected', label: 'Rejeitados', count: rejected, icon: XCircle },
  ]

  const createdLabel = new Date(job.created_at).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <main className="space-y-10 pb-10">
      {/* Hero — faixa accent + hierarquia clara */}
      <section
        aria-labelledby="job-dashboard-title"
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF3B3B] via-[#FF3B3B]/70 to-[#0B0B0B]"
          aria-hidden
        />
        <div className="pl-5 sm:pl-6 pr-4 sm:pr-6 py-6 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 -ml-2 px-3 text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                asChild
              >
                <Link href="/dashboard/jobs">
                  <ArrowLeft className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Voltar às vagas
                </Link>
              </Button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B0B0B] shadow-inner ring-1 ring-black/5">
                  <Briefcase className="h-7 w-7 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                    Painel da vaga
                  </p>
                  <h1 id="job-dashboard-title" className="text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-balance leading-tight">
                    {job.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-foreground/50" aria-hidden />
                      <span>Aberta desde {createdLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#7C3AED]" aria-hidden />
                      <span>Triagem assistida por IA</span>
                    </span>
                  </div>
                  {job.application_code ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-[#F5F5F5]/80 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">job_code</span>
                      <code className="text-sm font-mono font-semibold text-foreground">{job.application_code}</code>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:items-end">
              <Button
                size="default"
                variant="outline"
                className="h-11 min-h-[44px] rounded-xl text-sm font-semibold justify-center sm:justify-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                asChild
              >
                <Link href={`/dashboard/jobs/${job.id}/integracao`}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Google Forms
                </Link>
              </Button>
              <Button
                size="default"
                className="h-11 min-h-[44px] rounded-xl text-sm font-semibold bg-[#0B0B0B] hover:bg-[#1a1a1a] justify-center sm:justify-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                asChild
              >
                <Link href={`/dashboard/jobs/${job.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Editar vaga
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros — navegação explícita + cor além do estado ativo */}
      <nav aria-label="Filtrar candidatos por status" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight">Inscrições</h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Toque num cartão para ver só candidatos nesse estado. O contador reflete todas as candidaturas desta vaga.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0">
          {filterItems.map(({ key, label, count, icon: Icon }) => {
            const href = key === 'all' ? `/dashboard/jobs/${jobId}` : `/dashboard/jobs/${jobId}?status=${key}`
            const active = statusFilter === key
            const p = FILTER_PALETTE[key]
            return (
              <li key={key}>
                <Link
                  href={href}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group block h-full min-h-[88px] rounded-2xl border bg-white p-4 shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-200',
                    'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    active
                      ? cn(p.activeBorder, p.activeBg, p.activeRing, 'shadow-md')
                      : cn('border-border/60', p.idleHover, 'hover:shadow-md')
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
                        active ? p.iconBg : 'bg-muted/80 group-hover:bg-muted'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', active ? p.iconText : 'text-muted-foreground')} aria-hidden />
                    </div>
                    <span className="sr-only">{active ? 'Filtro ativo: ' : 'Filtrar: '}</span>
                    <span
                      className={cn(
                        'text-[11px] font-bold uppercase tracking-wider text-right leading-tight',
                        active ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-3 text-3xl font-bold tabular-nums tracking-tight',
                      active ? 'text-foreground' : 'text-foreground/90'
                    )}
                  >
                    {count}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">
                    {key === 'all' ? 'Total na vaga' : `Só ${label.toLowerCase()}`}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {job.description?.trim() || job.technical_criteria?.trim() || job.cultural_criteria?.trim() ? (
        <section aria-labelledby="job-summary-heading" className="space-y-3">
          <h2 id="job-summary-heading" className="text-lg font-bold tracking-tight">
            Contexto da vaga
          </h2>
          <Card className="overflow-hidden border border-border/70 bg-white rounded-2xl shadow-sm">
            <CardHeader className="border-b border-border/50 bg-[#FAFAFA]/80 pb-4">
              <CardTitle className="text-base font-bold">O que a IA usa na triagem</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Descrição e critérios enviados à análise. Atualize-os ao editar a vaga.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 p-0 sm:p-0">
              {job.description?.trim() ? (
                <div className="px-5 py-5 sm:px-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Descrição</p>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{job.description.trim()}</p>
                </div>
              ) : null}
              {job.technical_criteria?.trim() ? (
                <div className="px-5 py-5 sm:px-6 flex gap-4">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B0B0B]/5 text-foreground">
                    <Target className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 sm:hidden" aria-hidden />
                      Critérios técnicos
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{job.technical_criteria.trim()}</p>
                  </div>
                </div>
              ) : null}
              {job.cultural_criteria?.trim() ? (
                <div className="px-5 py-5 sm:px-6 flex gap-4">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF3B3B]/8 text-[#B91C1C]">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 sm:hidden text-[#B91C1C]" aria-hidden />
                      Critérios culturais
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{job.cultural_criteria.trim()}</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="candidates-table-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 id="candidates-table-heading" className="text-lg font-bold tracking-tight">
            Candidatos
            {statusFilter !== 'all' ? (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                · {filterItems.find((f) => f.key === statusFilter)?.label}
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {candidates.length} {candidates.length === 1 ? 'linha' : 'linhas'}
            {statusFilter === 'all' ? ` de ${total}` : ''}
          </p>
        </div>

        {candidates.length > 0 ? (
          <Card className="border border-border/70 bg-white rounded-2xl shadow-sm overflow-hidden">
            <Table className="min-w-[640px]">
              <TableCaption className="sr-only mt-0">
                Lista de candidatos inscritos nesta vaga, com status e notas de avaliação técnica e cultural.
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-[#F5F5F5] hover:bg-[#F5F5F5] border-b border-border/60">
                  <TableHead className="sticky top-0 z-10 bg-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                    Candidato
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                    Status
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                    Técnico
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                    Cultural
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right w-[132px] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate, index) => (
                  <TableRow
                    key={candidate.id}
                    className={cn(
                      'border-b border-border/30 transition-colors duration-150 hover:bg-[#F5F5F5]/70',
                      index % 2 === 1 && 'bg-muted/25'
                    )}
                  >
                    <TableCell className="py-4 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B0B0B] text-white text-xs font-bold ring-2 ring-white shadow-sm"
                          aria-hidden
                        >
                          {candidate.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/candidates/${candidate.id}`}
                              className="font-semibold text-sm text-foreground hover:text-[#7C3AED] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                            >
                              {candidate.name}
                            </Link>
                            {'form_responses' in candidate &&
                              Array.isArray(candidate.form_responses) &&
                              candidate.form_responses.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 font-semibold border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5"
                                >
                                  Formulário
                                </Badge>
                              )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{candidate.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">{statusBadge(candidate.status)}</TableCell>
                    <TableCell
                      className={cn('text-right font-bold text-sm tabular-nums align-middle', scoreColor(candidate.technical_score))}
                    >
                      {candidate.technical_score != null ? `${candidate.technical_score}%` : '—'}
                    </TableCell>
                    <TableCell
                      className={cn('text-right font-bold text-sm tabular-nums align-middle', scoreColor(candidate.cultural_score))}
                    >
                      {candidate.cultural_score != null ? `${candidate.cultural_score}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="sm" className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" asChild>
                          <Link href={`/dashboard/candidates/${candidate.id}`} aria-label={`Ver ficha e análise IA de ${candidate.name}`}>
                            <Eye className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" asChild>
                          <Link href={`/dashboard/candidates/${candidate.id}/edit`} aria-label={`Editar ${candidate.name}`}>
                            <Edit className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                        <CandidateDeleteButton id={candidate.id} name={candidate.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border/70 bg-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_1px_1px,#e5e5e5_1px,transparent_0)] [background-size:20px_20px]"
              aria-hidden
            />
            <div className="relative px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-border/60">
                <Users className="h-7 w-7 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="text-base font-semibold mb-1.5">
                {total === 0 ? 'Ainda não há candidaturas' : 'Nenhum resultado neste filtro'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                {total === 0
                  ? 'Partilhe o formulário ou a API de candidatura com o job_code desta vaga para começar a receber perfis.'
                  : 'Experimente outro filtro ou aguarde novas entradas com este status.'}
              </p>
              {total === 0 ? (
                <Button className="h-11 min-h-[44px] rounded-xl font-semibold px-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" asChild>
                  <Link href={`/dashboard/jobs/${job.id}/integracao`}>Abrir integração Google Forms</Link>
                </Button>
              ) : (
                <Button variant="outline" className="h-11 min-h-[44px] rounded-xl font-semibold px-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" asChild>
                  <Link href={`/dashboard/jobs/${jobId}`}>Limpar filtro · ver todos ({total})</Link>
                </Button>
              )}
            </div>
          </Card>
        )}
      </section>
    </main>
  )
}
