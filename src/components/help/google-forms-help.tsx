'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CopyBlock } from '@/components/help/copy-block'
import { Button } from '@/components/ui/button'
import { buildAppsScript } from '@/components/jobs/job-google-forms-integration'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'

export type GoogleFormsHelpProps = {
  /** Dentro de Configurações: sem link “voltar” ao dashboard */
  variant?: 'page' | 'embedded'
}

function useOrigin() {
  return useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])
}

/** Script padrão: candidaturas gerais, sem vaga obrigatória (mesmo motor que na página da vaga). */
const JOB_ENTRADA_GERAL = { id: '', title: 'Entrada geral', application_code: null }

const EXAMPLE_JSON = `{
  "form_responses": [
    { "question": "Nome completo", "answer": "Maria Silva" },
    { "question": "E-mail", "answer": "maria@exemplo.com" }
  ]
}`

const EXAMPLE_JSON_COM_VAGA = `{
  "job_code": "frontend-sp",
  "form_responses": [
    { "question": "E-mail", "answer": "candidato@exemplo.com" }
  ]
}`

export function GoogleFormsHelp({ variant = 'page' }: GoogleFormsHelpProps) {
  const embedded = variant === 'embedded'
  const origin = useOrigin()
  const endpoint = origin ? `${origin}/api/cv/submit` : 'https://seu-dominio.com/api/cv/submit'
  const staticDocHref = origin ? `${origin}/docs/google-forms-integration.html` : '/docs/google-forms-integration.html'

  const scriptPadrao = useMemo(
    () => buildAppsScript(origin ? `${origin}/api/cv/submit` : '/api/cv/submit', JOB_ENTRADA_GERAL),
    [origin]
  )

  return (
    <div className={embedded ? 'max-w-3xl space-y-8 pb-4' : 'max-w-3xl mx-auto space-y-10 pb-16'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {!embedded && (
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2 text-[#7C3AED] mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Integração</span>
            </div>
            {embedded ? (
              <h2 className="text-xl font-bold tracking-tight">Google Forms → candidaturas</h2>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">Google Forms → candidaturas</h1>
            )}
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Ligue um Google Formulário ao painel: cada envio cria uma candidatura com as respostas. Não é obrigatório
              ter uma vaga cadastrada — pode usar só o script abaixo (entrada geral). Se quiser associar a uma vaga,
              inclua <code className="text-xs">job_code</code> ou <code className="text-xs">job_id</code> no envio ou use
              o script gerado na página <strong>Google Forms</strong> de cada vaga.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 font-semibold" asChild>
          <a href={staticDocHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Guia para imprimir (HTML)
          </a>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">1. O que acontece</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>O formulário envia os dados para o Maverick por HTTP (Google Apps Script).</li>
          <li>
            O painel regista nome e e-mail a partir das respostas (ou do e-mail recolhido pelo Google, se ativar essa
            opção no formulário).
          </li>
          <li>
            Currículo em ficheiro (PDF ou Word) é opcional: pode haver só perguntas de texto. Com vaga, a análise por IA
            usa os critérios da vaga; sem vaga, a candidatura fica pendente para revisão manual.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">2. Endereço da API</h2>
        <p className="text-sm text-muted-foreground">
          No Google Apps Script, use este endereço como destino (<code className="rounded bg-muted px-1 text-xs">POST</code>
          , corpo JSON).
        </p>
        <CopyBlock
          label="URL"
          description="Deve ser o domínio onde o painel está instalado."
          value={endpoint}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">3. Token de integração</h2>
        <p className="text-sm text-muted-foreground">
          O script abaixo já inclui o token correto para este painel. Cada pedido deve enviar{' '}
          <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer {'<token>'}</code> com esse valor (o
          modelo faz isso por si).
        </p>
        <p className="text-xs text-muted-foreground">
          Não partilhe o script nem o token em sítios públicos; quem tiver o token pode criar candidaturas.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">4. Corpo do pedido (resumo)</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>
            <strong>Obrigatório:</strong> respostas do formulário em <code className="text-xs">form_responses</code> (lista
            de <code className="text-xs">{'{ question, answer }'}</code>) <em>ou</em> nome e e-mail explícitos no JSON.
          </li>
          <li>
            <strong>Opcional:</strong> <code className="text-xs">job_code</code> ou <code className="text-xs">job_id</code>{' '}
            para ligar à vaga. Se omitir, fica entrada geral.
          </li>
          <li>
            <strong>Opcional:</strong> currículo em base64 (<code className="text-xs">cv_base64</code>,{' '}
            <code className="text-xs">cv_filename</code>, <code className="text-xs">cv_mime_type</code>) ou URL HTTPS (
            <code className="text-xs">cv_url</code>).
          </li>
        </ul>
        <CopyBlock label="Exemplo — só formulário (entrada geral)" value={EXAMPLE_JSON} multiline />
        <CopyBlock label="Exemplo — com código de vaga" value={EXAMPLE_JSON_COM_VAGA} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">5. Google Apps Script (modelo padrão)</h2>
        <p className="text-sm text-muted-foreground">
          Abra o script <strong>a partir do formulário</strong>: Formulário → Extensões → Apps Script. Cole o código,
          guarde (Ctrl+S). Depois: Relógio → Gatilhos → Adicionar gatilho — função{' '}
          <code className="text-xs">enviarMaverick</code>, origem <strong>Do formulário</strong>, evento{' '}
          <strong>Ao enviar o formulário</strong>. Não use a função reservada <code className="text-xs">onFormSubmit</code>{' '}
          para chamar a API (o Google não permite HTTP nesse modo).
        </p>
        <CopyBlock label="Script completo (copiar para o Apps Script)" value={scriptPadrao} multiline />
      </section>

      <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm">
        <p className="font-semibold text-emerald-900 dark:text-emerald-200">Checklist rápido</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>No Google Formulário: ativar “Recolher endereços de e-mail dos inquiridos” ou incluir e-mail nas perguntas.</li>
          <li>Gatilho na função <code className="text-xs">enviarMaverick</code> (nome igual ao do código).</li>
          <li>Autorizar o script (acesso à rede e ao Drive, se houver upload de ficheiros).</li>
          <li>Testar com uma resposta real pelo link público do formulário.</li>
        </ul>
      </section>
    </div>
  )
}
