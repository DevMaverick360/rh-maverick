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
  "job_code": "frontend-sp-2025",
  "cv_base64": "<BASE64_DO_PDF>",
  "cv_filename": "curriculo.pdf",
  "cv_mime_type": "application/pdf",
  "form_responses": [
    { "question": "Qualquer pergunta", "answer": "Resposta livre" },
    { "question": "E-mail", "answer": "candidato@exemplo.com" }
  ]
}`

const APPS_SCRIPT = `/**
 * Plug-and-play: envia todas as respostas (exceto upload) em form_responses.
 * O servidor infere nome/e-mail/telefone. Inclua pergunta de e-mail válido no form.
 *
 * Formulário → Extensões → Apps Script → cole → gatilho "Ao enviar formulário".
 */
const API_URL = 'SUBSTITUA_PELA_URL_DO_SEU_SITE/api/cv/submit';
const INGEST_SECRET = 'SUBSTITUA_PELO_CV_INGEST_SECRET';
const JOB_CODE = 'codigo-da-vaga-no-painel';
const JOB_ID = '';

function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
  var formResponses = [];
  var cvBlob = null;
  var cvName = 'curriculo.pdf';
  var cvMime = 'application/pdf';

  for (var i = 0; i < itemResponses.length; i++) {
    var ir = itemResponses[i];
    var item = ir.getItem();
    var type = item.getType();
    var title = item.getTitle();

    if (type === FormApp.ItemType.FILE_UPLOAD) {
      var ids = ir.getResponse();
      if (ids && ids.length) {
        var id0 = String(ids[0]);
        var m = id0.match(/[-\\w]{25,}/);
        var fileId = m ? m[0] : id0;
        var file = DriveApp.getFileById(fileId);
        cvBlob = file.getBlob();
        cvName = file.getName() || cvName;
        cvMime = file.getMimeType() || cvMime;
      }
      continue;
    }
    formResponses.push({ question: title, answer: formatAnswer(ir.getResponse()) });
  }

  if (!cvBlob) {
    throw new Error('Adicione pergunta "Upload de arquivo" para o CV (PDF).');
  }

  var payload = {
    cv_base64: Utilities.base64Encode(cvBlob.getBytes()),
    cv_filename: cvName,
    cv_mime_type: cvMime,
    form_responses: formResponses
  };
  if (JOB_CODE) payload.job_code = JOB_CODE;
  if (JOB_ID) payload.job_id = JOB_ID;

  var res = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + INGEST_SECRET }
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('API ' + code + ': ' + res.getContentText());
  }
}

function formatAnswer(resp) {
  if (resp == null) return '';
  if (Object.prototype.toString.call(resp) === '[object Array]') {
    return resp.join(', ');
  }
  return String(resp);
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
              Modo recomendado: <code className="text-xs">form_responses</code> com todas as perguntas + CV em base64;
              nome, e-mail e telefone são inferidos no servidor. Em cada vaga use a página <strong>Google Forms</strong>{' '}
              (script já com <code className="text-xs">job_code</code>).
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
            <strong>Plug-and-play:</strong> <code className="text-xs">job_id</code> ou <code className="text-xs">job_code</code>,{' '}
            <code className="text-xs">cv_base64</code> (ou <code className="text-xs">cv_url</code>) e{' '}
            <code className="text-xs">form_responses</code> (ou <code className="text-xs">form_submission</code>) — array{' '}
            <code className="text-xs">{'{ question, answer }'}</code> com <em>todas</em> as respostas do formulário. Inclua
            pelo menos uma resposta com e-mail válido.
          </li>
          <li>
            <strong>Opcional explícito:</strong> <code className="text-xs">name</code>, <code className="text-xs">email</code>,{' '}
            <code className="text-xs">phone</code> — se enviados, têm prioridade sobre a inferência.
          </li>
          <li>Você também pode enviar só <code className="text-xs">name</code>, <code className="text-xs">email</code> e{' '}
            <code className="text-xs">form_responses</code> como contexto extra (sem inferência de e-mail nas respostas).</li>
        </ul>
        <CopyBlock label="Exemplo de JSON (inferência)" value={EXAMPLE_JSON} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">5. Google Apps Script</h2>
        <p className="text-sm text-muted-foreground">
          Um único script: pergunta de upload para o CV; demais perguntas viram JSON. Ajuste só{' '}
          <code className="text-xs">API_URL</code>, <code className="text-xs">INGEST_SECRET</code> e{' '}
          <code className="text-xs">JOB_CODE</code> (ou <code className="text-xs">JOB_ID</code>). Gatilho: &quot;Ao enviar
          formulário&quot;.
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
