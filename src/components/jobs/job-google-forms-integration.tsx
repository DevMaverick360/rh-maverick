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

function buildAppsScript(apiUrl: string, job: JobIntegrationJob): string {
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
 * Como usar:
 * 1) Abra o formulário → Extensões → Apps Script → apague o conteúdo e cole este arquivo inteiro.
 * 2) Salve o projeto (ícone de disquete).
 * 3) À esquerda, ícone de relógio (Gatilhos) → Adicionar gatilho → função "onFormSubmit" →
 *    evento "Ao enviar formulário" → Salvar → autorize quando o Google pedir (acesso ao Drive para ler o anexo do CV).
 */
const ENDERECO_API = ${JSON.stringify(apiUrl)};
const TOKEN_INTEGRACAO = ${JSON.stringify(INTEGRATION_TOKEN)};
${jobBlock}

function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
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
      if (ids && ids.length) {
        var id0 = String(ids[0]);
        var m = id0.match(/[-\\w]{25,}/);
        var idArquivo = m ? m[0] : id0;
        var arquivo = DriveApp.getFileById(idArquivo);
        arquivoCv = arquivo.getBlob();
        nomeArquivo = arquivo.getName() || nomeArquivo;
        tipoArquivo = arquivo.getMimeType() || tipoArquivo;
      }
      continue;
    }

    respostas.push({ question: titulo, answer: formatarResposta(ir.getResponse()) });
  }

  if (!arquivoCv) {
    throw new Error('Inclua uma pergunta do tipo "Upload de arquivo" para o currículo (PDF). As outras perguntas podem ser como quiser.');
  }

  var corpo = {
    cv_base64: Utilities.base64Encode(arquivoCv.getBytes()),
    cv_filename: nomeArquivo,
    cv_mime_type: tipoArquivo,
    form_responses: respostas
  };
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

• Uma pergunta de e-mail (de preferência o tipo "Validação de e-mail" do Google) — para identificarmos o candidato.
• Uma pergunta "Upload de arquivo" para o currículo em PDF.
• Qualquer outra pergunta (texto, múltipla escolha, etc.) — as respostas aparecem no Maverick junto com a candidatura.

Não é preciso mudar o script quando mudar as perguntas: ele envia tudo automaticamente, exceto o arquivo, que vai anexado.`

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
            Use o script abaixo no Google Formulário. Cada envio registra a candidatura no Maverick com o currículo e
            todas as respostas.
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
            No Apps Script: menu à esquerda <strong>Relógio</strong> (Gatilhos) → <strong>Adicionar gatilho</strong> →
            escolha a função <code className="text-xs font-mono">onFormSubmit</code> → evento{' '}
            <strong>Ao enviar formulário</strong> → salve e autorize o acesso ao Google Drive quando solicitado.
          </li>
          <li>Faça um envio de teste e confira se a candidatura apareceu no Maverick.</li>
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
