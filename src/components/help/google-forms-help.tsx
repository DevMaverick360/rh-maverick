'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CopyBlock } from '@/components/help/copy-block'
import { Button } from '@/components/ui/button'
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

const EXAMPLE_JSON = `{
  "name": "Nome Completo do Candidato",
  "email": "email@exemplo.com",
  "phone": "+55 11 99999-9999",
  "job_code": "frontend-sp-2025",
  "cv_base64": "<BASE64_DO_PDF>",
  "cv_filename": "curriculo.pdf",
  "cv_mime_type": "application/pdf",
  "form_responses": [
    { "question": "Título da pergunta no Google Form", "answer": "Resposta do candidato" }
  ]
}`

const APPS_SCRIPT = `/**
 * Instalação: Formulário → Extensões → Apps Script
 * Preencha as constantes abaixo e adicione um gatilho "Ao enviar formulário".
 */
const API_URL = 'SUBSTITUA_PELA_URL_DO_SEU_SITE/api/cv/submit';
const INGEST_SECRET = 'SUBSTITUA_PELO_CV_INGEST_SECRET';
const JOB_CODE = 'codigo-da-vaga-no-painel'; // ou use campo oculto no form

function onFormSubmit(e) {
  const itemResponses = e.response.getItemResponses();
  const formResponses = [];
  for (var i = 0; i < itemResponses.length; i++) {
    var ir = itemResponses[i];
    var title = ir.getItem().getTitle();
    var answer = formatAnswer(ir.getResponse());
    formResponses.push({ question: title, answer: answer });
  }

  var named = mapNamedFields_(e.response);
  var fileBlob = named.cvFile;
  if (!fileBlob) {
    throw new Error('Defina uma pergunta de upload de arquivo e ajuste mapNamedFields_');
  }
  var bytes = fileBlob.getBytes();
  var b64 = Utilities.base64Encode(bytes);

  var payload = {
    name: named.name,
    email: named.email,
    phone: named.phone || '',
    job_code: named.jobCode || JOB_CODE,
    cv_base64: b64,
    cv_filename: fileBlob.getName() || 'curriculo.pdf',
    cv_mime_type: fileBlob.getContentType() || 'application/pdf',
    form_responses: formResponses
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + INGEST_SECRET }
  };

  var res = UrlFetchApp.fetch(API_URL, options);
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error('API: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function formatAnswer(resp) {
  if (resp == null) return '';
  if (Object.prototype.toString.call(resp) === '[object Array]') {
    return resp.join(', ');
  }
  return String(resp);
}

/**
 * Ajuste os títulos das perguntas do seu formulário (exatamente como no Google Form).
 */
function mapNamedFields_(response) {
  var items = response.getItemResponses();
  var out = { name: '', email: '', phone: '', jobCode: '', cvFile: null };
  for (var i = 0; i < items.length; i++) {
    var ir = items[i];
    var title = ir.getItem().getTitle();
    var type = ir.getItem().getType();
    if (type === FormApp.ItemType.FILE_UPLOAD) {
      var ids = ir.getResponse();
      if (ids && ids.length) {
        out.cvFile = DriveApp.getFileById(ids[0]).getBlob();
      }
      continue;
    }
    var t = title.toLowerCase();
    var val = formatAnswer(ir.getResponse());
    if (t.indexOf('nome') !== -1 && t.indexOf('email') === -1) out.name = val;
    else if (t.indexOf('email') !== -1) out.email = val;
    else if (t.indexOf('telefone') !== -1 || t.indexOf('phone') !== -1) out.phone = val;
    else if (t.indexOf('job') !== -1 || t.indexOf('vaga') !== -1 || t.indexOf('código') !== -1) out.jobCode = val;
  }
  return out;
}`

const CURL_EXAMPLE = `curl -sS -X POST "https://SEU_DOMINIO/api/cv/submit" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SEU_CV_INGEST_SECRET" \\
  -d @corpo.json`

export function GoogleFormsHelp({ variant = 'page' }: GoogleFormsHelpProps) {
  const embedded = variant === 'embedded'
  const origin = useOrigin()
  const endpoint = origin ? `${origin}/api/cv/submit` : 'https://seu-dominio.com/api/cv/submit'
  const staticDocHref = origin ? `${origin}/docs/google-forms-integration.html` : '/docs/google-forms-integration.html'

  const headersValue = `Content-Type: application/json
Authorization: Bearer <CV_INGEST_SECRET>

Alternativa ao header Authorization:
x-cv-ingest-secret: <CV_INGEST_SECRET>`

  const envList = `CV_INGEST_SECRET=         # obrigatório em produção — mesmo valor no Apps Script
SUPABASE_SERVICE_ROLE_KEY=  # recomendado — upload de CV sem sessão do candidato
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=`

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
              <h2 className="text-xl font-bold tracking-tight">Google Forms → Painel</h2>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">Google Forms → Painel</h1>
            )}
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Envie candidaturas com CV e respostas do formulário para a API. O candidato aparece no painel com
              notas e feedback da IA.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 font-semibold" asChild>
          <a href={staticDocHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir HTML estático
          </a>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">1. Endpoint</h2>
        <p className="text-sm text-muted-foreground">
          Método <strong>POST</strong>. Corpo <strong>application/json</strong> (recomendado para o Google Apps Script).
        </p>
        <CopyBlock
          label="URL da API"
          description="Use no Apps Script (API_URL) ou em ferramentas como Postman."
          value={endpoint}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">2. Autenticação</h2>
        <p className="text-sm text-muted-foreground">
          Com <code className="rounded bg-muted px-1 text-xs">CV_INGEST_SECRET</code> definido no servidor, toda
          requisição deve enviar o mesmo segredo.
        </p>
        <CopyBlock label="Headers HTTP" value={headersValue} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">3. Variáveis de ambiente (servidor)</h2>
        <CopyBlock
          label=".env.local (referência)"
          description="Não commite segredos. O painel não exibe o valor real do segredo."
          value={envList}
          multiline
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">4. Corpo JSON (campos)</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>
            <strong>Obrigatórios:</strong> <code className="text-xs">name</code>, <code className="text-xs">email</code>
            , <code className="text-xs">job_id</code> (UUID) <em>ou</em> <code className="text-xs">job_code</code>{' '}
            (código da vaga no painel)
          </li>
          <li>
            <strong>CV:</strong> <code className="text-xs">cv_base64</code> + <code className="text-xs">cv_filename</code>{' '}
            ou <code className="text-xs">cv_url</code> (HTTPS)
          </li>
          <li>
            <strong>Opcional:</strong> <code className="text-xs">phone</code>,{' '}
            <code className="text-xs">form_responses</code> (array de pergunta/resposta)
          </li>
        </ul>
        <CopyBlock label="Exemplo de JSON" value={EXAMPLE_JSON} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">5. Google Apps Script</h2>
        <p className="text-sm text-muted-foreground">
          Cole no editor do formulário, ajuste títulos das perguntas em <code className="text-xs">mapNamedFields_</code>,
          crie o gatilho &quot;Ao enviar formulário&quot; e autorize o acesso ao Drive (upload de arquivo).
        </p>
        <CopyBlock label="Script completo (modelo)" value={APPS_SCRIPT} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">6. Teste rápido (curl)</h2>
        <CopyBlock label="Comando curl" value={CURL_EXAMPLE} multiline />
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 text-sm text-foreground/90">
        <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Checklist</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Migrações aplicadas no Supabase (incl. <code className="text-xs">application_code</code> e{' '}
            <code className="text-xs">form_responses</code>)</li>
          <li>Bucket <code className="text-xs">cvs</code> com política compatível com service role</li>
          <li>Vaga com <code className="text-xs">job_code</code> igual ao enviado pelo formulário</li>
        </ul>
      </section>
    </div>
  )
}
