import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzeCVWithAI } from '@/lib/openai/analyze'
import { sendCandidateEmail } from '@/lib/email/send'
import type { FormQaItem } from '@/lib/cv/form-responses'
import { formResponsesToAiContext, parseFormResponses } from '@/lib/cv/form-responses'

const CV_MAX_BYTES = 10 * 1024 * 1024
const AI_THRESHOLD = 70

export function normalizeApplicationCode(code: string): string {
  return code.trim().toLowerCase()
}

export async function resolveJobId(
  supabase: SupabaseClient,
  jobId: string | undefined,
  jobCode: string | undefined
): Promise<{ id: string } | { error: string }> {
  if (jobId?.trim()) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId.trim())
      .maybeSingle()
    if (error || !data) return { error: 'job_id inválido ou não encontrado' }
    return { id: data.id }
  }
  const code = jobCode?.trim()
  if (code) {
    const normalized = normalizeApplicationCode(code)
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('application_code', normalized)
      .maybeSingle()
    if (error || !data) return { error: 'job_code inválido ou não encontrado' }
    return { id: data.id }
  }
  return { error: 'Informe job_id (UUID) ou job_code da vaga' }
}

function fileExtensionLower(name: string | null | undefined): string {
  if (!name?.trim()) return ''
  const base = name.split('/').pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1).toLowerCase().trim() : ''
}

/** PDF, Word (.doc / .docx) ou texto simples (.txt) — usado na validação e na extração para a IA. */
function cvFormatForExtraction(mimeType: string, originalFileName?: string | null): 'pdf' | 'word' | 'text' | null {
  const mt = mimeType.toLowerCase()
  const ext = fileExtensionLower(originalFileName)

  if (mt === 'application/pdf' || mt.endsWith('/pdf') || ext === 'pdf') return 'pdf'

  if (
    mt === 'application/msword' ||
    mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mt.includes('wordprocessingml') ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return 'word'
  }

  if (mt.startsWith('text/plain') || ext === 'txt') return 'text'

  return null
}

export function cvSupportedForAiAnalysis(mimeType: string, originalFileName?: string | null): boolean {
  return cvFormatForExtraction(mimeType, originalFileName) !== null
}

let pdfjsWorkerTried = false

/** pdfjs no Next/Turbopack: apontar o worker para o ficheiro real em node_modules (evita "fake worker" com path em .next). */
function ensurePdfjsWorker(PDFParse: { setWorker: (src?: string) => string }): void {
  if (pdfjsWorkerTried) return
  pdfjsWorkerTried = true
  try {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
    PDFParse.setWorker(pathToFileURL(workerPath).href)
  } catch {
    // Mantém o default do pdfjs; pode falhar noutros ambientes
  }
}

async function extractCvText(
  buffer: Buffer,
  mimeType: string,
  originalFileName?: string | null
): Promise<string> {
  const kind = cvFormatForExtraction(mimeType, originalFileName)

  if (kind === 'pdf') {
    // pdf-parse v2+: named export PDFParse + getText(); v1 was default(buffer) — not compatible
    const mod = await import('pdf-parse')
    ensurePdfjsWorker(mod.PDFParse)
    const PDFParse = mod.PDFParse as new (opts: { data: Buffer }) => {
      getText: (params?: object) => Promise<{ text: string }>
      destroy: () => Promise<void>
    }
    const parser = new PDFParse({ data: buffer })
    try {
      const pdfData = await parser.getText()
      return (pdfData.text || '').trim()
    } finally {
      await parser.destroy()
    }
  }

  if (kind === 'word') {
    const mod = await import('word-extractor')
    const WordExtractor = mod.default
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buffer)
    return (doc.getBody() || '').trim()
  }

  if (kind === 'text') {
    return buffer.toString('utf-8').trim().slice(0, 500_000)
  }

  throw new Error(
    `Formato de CV não suportado para análise (${mimeType || 'desconhecido'}). Use PDF ou Word (.doc, .docx).`
  )
}

export async function uploadCvBuffer(
  supabase: SupabaseClient,
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ cvUrl: string; storagePath: string } | { error: string }> {
  const safeName = originalName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'cv.pdf'
  const storagePath = `${Date.now()}_${safeName}`
  const body = new Uint8Array(buffer)
  const blob = new Blob([body], { type: mimeType || 'application/octet-stream' })
  const { error: uploadError } = await supabase.storage.from('cvs').upload(storagePath, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: mimeType || undefined,
  })
  if (uploadError) {
    console.error('Upload Error:', uploadError)
    return { error: 'Falha ao enviar o arquivo do CV' }
  }
  const { data: publicUrlData } = supabase.storage.from('cvs').getPublicUrl(storagePath)
  return { cvUrl: publicUrlData.publicUrl, storagePath }
}

export async function fetchCvFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string; name: string } | { error: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { error: 'cv_url inválida' }
  }
  if (parsed.protocol !== 'https:') {
    return { error: 'cv_url deve usar HTTPS' }
  }
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 15_000)
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'rh-maverick-cv-ingest/1.0' },
    })
    if (!res.ok) return { error: `Falha ao baixar cv_url (${res.status})` }
    const len = res.headers.get('content-length')
    if (len && Number(len) > CV_MAX_BYTES) return { error: 'Arquivo do CV excede o tamanho máximo' }
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > CV_MAX_BYTES) return { error: 'Arquivo do CV excede o tamanho máximo' }
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream'
    const name = parsed.pathname.split('/').pop() || 'cv'
    return { buffer, mimeType, name }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { error: 'Timeout ao baixar cv_url' }
    console.error('fetchCvFromUrl:', e)
    return { error: 'Não foi possível baixar cv_url' }
  } finally {
    clearTimeout(t)
  }
}

export async function insertCandidateRow(
  supabase: SupabaseClient,
  input: {
    name: string
    email: string
    phone: string | null
    jobId: string
    cvUrl: string | null
    formResponses?: FormQaItem[] | null
  }
): Promise<{ id: string } | { error: string }> {
  const { data: candidate, error: dbError } = await supabase
    .from('candidates')
    .insert({
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      job_id: input.jobId,
      cv_url: input.cvUrl ?? null,
      status: 'pending',
      form_responses: input.formResponses?.length ? input.formResponses : null,
    })
    .select('id')
    .single()

  if (dbError || !candidate) {
    console.error('DB Error:', dbError)
    return { error: 'Falha ao registrar candidato' }
  }
  return { id: candidate.id }
}

const NO_CV_PLACEHOLDER_PT =
  '(Candidatura sem ficheiro de currículo. Avalie apenas com base nas respostas do formulário e nos critérios da vaga.)'

async function persistCandidateAiScores(
  supabase: SupabaseClient,
  candidateId: string,
  jobId: string,
  buffer: Buffer | null,
  mimeType: string,
  formResponses: FormQaItem[] | null | undefined,
  cvOriginalFileName?: string | null
): Promise<{ ok: true; newStatus: 'approved' | 'rejected' } | { error: string }> {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('cultural_criteria, technical_criteria, description')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return { error: 'Vaga não encontrada ou sem permissão para ler critérios.' }
    }

    const cvText =
      buffer && buffer.length > 0
        ? await extractCvText(buffer, mimeType, cvOriginalFileName)
        : NO_CV_PLACEHOLDER_PT
    const formContext = formResponsesToAiContext(formResponses ?? null)
    const aiResult = await analyzeCVWithAI(
      cvText,
      job.cultural_criteria ?? '',
      job.technical_criteria ?? '',
      job.description ?? undefined,
      formContext || undefined
    )

    const isApproved = aiResult.technicalScore >= AI_THRESHOLD && aiResult.culturalScore >= AI_THRESHOLD
    const newStatus = isApproved ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        cultural_score: aiResult.culturalScore,
        technical_score: aiResult.technicalScore,
        ai_summary: aiResult.summary,
        status: newStatus,
      })
      .eq('id', candidateId)

    if (updateError) {
      console.error('Candidate Update Error:', updateError)
      return { error: 'Falha ao guardar resultado da análise.' }
    }

    return { ok: true, newStatus }
  } catch (error) {
    console.error('AI Processing Error:', error)
    if (error instanceof Error && error.message.includes('Formato de CV não suportado')) {
      return { error: error.message }
    }
    return { error: 'Erro ao executar análise de IA.' }
  }
}

/** Reanalisa candidato com os critérios atuais da vaga (painel). Não envia e-mail ao candidato. */
export async function rerunCandidateAiAnalysis(
  supabase: SupabaseClient,
  candidateId: string
): Promise<{ ok: true } | { error: string }> {
  const { data: row, error: fetchError } = await supabase
    .from('candidates')
    .select('id, job_id, cv_url, form_responses')
    .eq('id', candidateId)
    .maybeSingle()

  if (fetchError || !row) {
    return { error: 'Candidato não encontrado.' }
  }

  if (!row.job_id) {
    return { error: 'Associe uma vaga ao candidato para poder analisar pelos critérios da IA.' }
  }

  const parsed = parseFormResponses(row.form_responses)
  if (parsed && 'error' in parsed) {
    return { error: parsed.error }
  }
  const formItems: FormQaItem[] | null = parsed

  let buffer: Buffer | null = null
  let mimeType = 'application/pdf'
  const url = row.cv_url?.trim()
  if (url) {
    const fetched = await fetchCvFromUrl(url)
    if ('error' in fetched) {
      return {
        error: `${fetched.error} Atualize o CV ou tente sem ficheiro (só formulário).`,
      }
    }
    buffer = fetched.buffer
    mimeType = fetched.mimeType
  }

  let storageFileHint: string | null = null
  if (url) {
    try {
      const path = new URL(url).pathname
      storageFileHint = path.split('/').pop() || null
    } catch {
      /* ignore */
    }
  }
  return persistCandidateAiScores(supabase, row.id, row.job_id, buffer, mimeType, formItems, storageFileHint)
}

export async function processCandidateAI(
  supabase: SupabaseClient,
  candidateId: string,
  name: string,
  email: string,
  buffer: Buffer | null,
  mimeType: string,
  cvUrl: string | null,
  jobId: string,
  formResponses?: FormQaItem[] | null,
  cvOriginalFileName?: string | null
): Promise<void> {
  const result = await persistCandidateAiScores(
    supabase,
    candidateId,
    jobId,
    buffer,
    mimeType,
    formResponses,
    cvOriginalFileName
  )

  if ('error' in result) {
    console.error('processCandidateAI:', result.error)
    return
  }

  try {
    const calendlyPlaceholder = `https://calendly.com/maverick360/interview-${jobId}`
    await sendCandidateEmail(email, name, result.newStatus, calendlyPlaceholder)
  } catch (e) {
    console.error('sendCandidateEmail:', e)
  }
}

export function bufferFromBase64(cvBase64: string): Buffer | { error: string } {
  try {
    const buffer = Buffer.from(cvBase64, 'base64')
    if (buffer.length > CV_MAX_BYTES) return { error: 'cv_base64 excede o tamanho máximo (10MB)' }
    if (buffer.length === 0) return { error: 'cv_base64 vazio ou inválido' }
    return buffer
  } catch {
    return { error: 'cv_base64 inválido' }
  }
}
