'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CopyBlock } from '@/components/help/copy-block'
import { INTEGRATION_TOKEN } from '@/lib/cv/integration-token'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'

export type JobIntegrationJob = {
  id: string
  title: string
  application_code: string | null
}

export function buildAppsScript(apiUrl: string, job: JobIntegrationJob): string {
  const code = (job.application_code ?? '').trim()
  const usesCode = code.length > 0
  const safeTitle = job.title.replace(/\r?\n/g, ' ').replace(/\*\//g, '')

  const jobBlock = usesCode
    ? `const CODIGO_VAGA = ${JSON.stringify(code)};\nvar ID_VAGA = '';`
    : `const CODIGO_VAGA = '';\nvar ID_VAGA = ${JSON.stringify(job.id)};`

  return `/**
 * Maverick — envio automático ao receber resposta do Google Formulário
 * Vaga: ${safeTitle}
 *
 * IMPORTANTE — Gatilho INSTALÁVEL (obrigatório):
 * A função reservada "onFormSubmit" usa gatilho SIMPLES: NÃO pode chamar UrlFetchApp (a API não recebe nada).
 * Crie gatilho INSTALÁVEL na função enviarMaverick (nome curto — copie exatamente do menu do gatilho).
 *
 * Como usar:
 * 1) Abra o script A PARTIR DO FORMULÁRIO: Formulário → Extensões → Apps Script (fica ligado ao form).
 * 2) Cole este código → Salvar (Ctrl+S). Confirme na barra lateral que aparece "enviarMaverick".
 * 3) Relógio (Gatilhos) → Adicionar gatilho:
 *    - função a executar: enviarMaverick  (ou aposEnviarFormularioMaverick — alias)
 *    - origem: Do formulário
 *    - evento: Ao enviar o formulário
 *    → Salvar → autorize (Drive + rede).
 * 4) Se aparecer "function not found": confira o nome no gatilho e que o projeto está guardado (sem erros de sintaxe).
 * 5) Teste pelo link público do formulário.
 *
 * Teste pelo editor (▶): função testarComUltimaResposta — após existir pelo menos 1 envio pelo form.
 *
 * E-mail: se o form usar "Recolher endereços de e-mail dos inquiridos", o script envia corpo.email automaticamente
 * (não depende de haver e-mail numa pergunta de texto).
 */
const ENDERECO_API = ${JSON.stringify(apiUrl)};
const TOKEN_INTEGRACAO = ${JSON.stringify(INTEGRATION_TOKEN)};
${jobBlock}

/**
 * Ponto de entrada recomendado no gatilho instalável (nome curto = menos erros).
 * NÃO use a função reservada onFormSubmit — gatilho simples bloqueia UrlFetchApp.
 */
function enviarMaverick(e) {
  if (!e || !e.response) {
    throw new Error(
      'Gatilho: função enviarMaverick (ou aposEnviarFormularioMaverick), origem "Do formulário", evento "Ao enviar o formulário". ' +
      'Teste no editor: testarComUltimaResposta().'
    );
  }
  enviarParaMaverickComResposta_(e.response);
}

/** Alias — pode usar no gatilho em vez de enviarMaverick */
function aposEnviarFormularioMaverick(e) {
  enviarMaverick(e);
}

/**
 * Teste manual no editor: selecione esta função no menu e clique Executar (▶).
 * Exige pelo menos uma resposta já enviada pelo link do formulário.
 */
function testarComUltimaResposta() {
  var form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('Abra o script pelo formulário: Formulário → Extensões → Apps Script.');
  }
  var todas = form.getResponses();
  if (!todas.length) {
    throw new Error('Envie uma resposta pelo link do Google Formulário primeiro; depois rode testarComUltimaResposta de novo.');
  }
  enviarParaMaverickComResposta_(todas[todas.length - 1]);
}

function enviarParaMaverickComResposta_(response) {
  var itemResponses = response.getItemResponses();
  var respostas = [];
  var arquivoCv = null;
  var nomeArquivo = 'curriculo.pdf';
  var tipoArquivo = 'application/pdf';

  for (var i = 0; i < itemResponses.length; i++) {
    var ir = itemResponses[i];
    var item = ir.getItem();
    var tipo = item.getType();
    var titulo = item.getTitle();

    if (tipo === FormApp.ItemType.FILE_UPLOAD) {
      var ids = ir.getResponse();
      if (ids != null && ids !== '') {
        if (Object.prototype.toString.call(ids) !== '[object Array]') {
          ids = [String(ids)];
        }
        if (ids.length) {
          var id0 = String(ids[0]);
          var m = id0.match(/[-\\w]{25,}/);
          var idArquivo = m ? m[0] : id0;
          var arquivo = DriveApp.getFileById(idArquivo);
          arquivoCv = arquivo.getBlob();
          nomeArquivo = arquivo.getName() || nomeArquivo;
          tipoArquivo = arquivo.getMimeType() || tipoArquivo;
        }
      }
      continue;
    }

    respostas.push({ question: titulo, answer: formatarResposta(ir.getResponse()) });
  }

  if (!arquivoCv && !respostas.length) {
    throw new Error(
      'Inclua perguntas no formulário (ex.: e-mail do candidato) ou uma pergunta "Upload de arquivo" com PDF ou Word (.doc, .docx). ' +
      'A API precisa de respostas ou de um CV para registar a candidatura.'
    );
  }

  var corpo = { form_responses: respostas };
  try {
    var emailInquirido = response.getRespondentEmail ? String(response.getRespondentEmail() || '').trim() : '';
    if (emailInquirido) corpo.email = emailInquirido;
  } catch (ignore) {}
  if (arquivoCv) {
    corpo.cv_base64 = Utilities.base64Encode(arquivoCv.getBytes());
    corpo.cv_filename = nomeArquivo;
    corpo.cv_mime_type = tipoArquivo;
  }
  if (CODIGO_VAGA) corpo.job_code = CODIGO_VAGA;
  if (ID_VAGA) corpo.job_id = ID_VAGA;

  var res = UrlFetchApp.fetch(ENDERECO_API, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + TOKEN_INTEGRACAO }
  });

  var codigoHttp = res.getResponseCode();
  if (codigoHttp < 200 || codigoHttp >= 300) {
    throw new Error('Maverick respondeu ' + codigoHttp + ': ' + res.getContentText());
  }
}

function formatarResposta(resp) {
  if (resp == null) return '';
  if (Object.prototype.toString.call(resp) === '[object Array]') {
    return resp.join(', ');
  }
  return String(resp);
}
`
}

const ORIENTACAO_FORMULARIO = `O que o formulário precisa ter:

• E-mail do candidato: em Definições do formulário pode usar "Recolher endereços de e-mail dos inquiridos" (o script envia automaticamente) e/ou pergunta "Validação de e-mail".
• Opcional: pergunta "Upload de arquivo" (clip) para o currículo em PDF ou Word (.doc, .docx). Links numa caixa de texto não substituem o upload.
• Outras perguntas (texto, múltipla escolha, etc.) — aparecem no Maverick em form_responses.

Sem upload, o Maverick regista a candidatura só com as respostas (a IA avalia com base no formulário). Com upload, o ficheiro é anexado. Quem anexa ficheiros precisa de sessão Google.`

export function JobGoogleFormsIntegration({ job }: { job: JobIntegrationJob }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const apiUrl = origin ? `${origin}/api/cv/submit` : '/api/cv/submit'
  const script = useMemo(() => buildAppsScript(apiUrl, job), [apiUrl, job])
  const hasJobCode = !!(job.application_code && job.application_code.trim())

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-16">
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard/jobs"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-white hover:bg-[#F5F5F5] transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-[#7C3AED] mb-1">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Google Formulário</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Conectar formulário a esta vaga</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Use o script abaixo no Google Formulário. Cada envio regista a candidatura no Maverick com as respostas; o
            upload de CV é opcional (a API aceita formulário só com perguntas).
          </p>
          <p className="text-sm font-semibold mt-3">{job.title}</p>
          {hasJobCode ? (
            <p className="text-xs text-muted-foreground mt-2">
              Esta vaga usa o código <span className="font-mono font-semibold">{job.application_code}</span> — já está
              definido no script.
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              Esta vaga está identificada no script por um código interno. Se o administrador criar um{' '}
              <strong>código curto</strong> para a vaga no Maverick, volte aqui para copiar o script atualizado (fica
              mais fácil de auditar).
            </p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#7C3AED]" />
          Passo a passo
        </h2>
        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
          <li>Monte o Google Formulário conforme a caixa &quot;O que o formulário precisa ter&quot; abaixo.</li>
          <li>
            No formulário: <strong>Extensões</strong> → <strong>Apps Script</strong> → apague o que estiver escrito →
            cole o script completo da seção 2 (o token de integração já vem no script) → salve.
          </li>
          <li>
            <strong>Gatilho instalável (obrigatório):</strong> no Apps Script, <strong>Relógio</strong> →{' '}
            <strong>Adicionar gatilho</strong> → função <code className="text-xs font-mono">enviarMaverick</code> (nome
            exatamente como no código) → origem <strong>Do formulário</strong> → evento{' '}
            <strong>Ao enviar o formulário</strong> → salvar e autorizar. Erro &quot;function not found&quot;: o gatilho
            aponta para um nome que não existe no ficheiro guardado — apague o gatilho errado e crie de novo após
            colar o script. Sem gatilho instalável, o Google só grava no Form (o simples{' '}
            <code className="text-xs font-mono">onFormSubmit</code> não permite HTTP).
          </li>
          <li>
            <strong>Teste pelo formulário:</strong> envie pelo link público; o gatilho deve executar{' '}
            <code className="text-xs font-mono">enviarMaverick</code>.
          </li>
          <li>
            <strong>Teste pelo editor (▶):</strong> após um envio real, rode{' '}
            <code className="text-xs font-mono">testarComUltimaResposta</code> (não use ▶ em{' '}
            <code className="text-xs font-mono">enviarMaverick</code>).
          </li>
          <li>Confira no Maverick se a candidatura apareceu.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">1. O que o formulário precisa ter</h2>
        <CopyBlock label="Copiar orientação" value={ORIENTACAO_FORMULARIO} multiline />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">2. Script (copiar tudo para o Apps Script)</h2>
        <p className="text-sm text-muted-foreground">
          O endereço da API, o token de integração e a vaga já vêm preenchidos — copie e use como está.
        </p>
        <CopyBlock label="Código completo" value={script} multiline />
      </section>

      <section className="rounded-2xl border border-border/60 bg-white px-5 py-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">Boas práticas</p>
        <p>
          Trate o token como senha: não envie por grupos públicos nem deixe o script público com o token preenchido.
          Quem tiver o token pode enviar candidaturas em nome do formulário.
        </p>
      </section>
    </div>
  )
}
