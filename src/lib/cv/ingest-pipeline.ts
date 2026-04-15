import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzeCVWithAI } from '@/lib/openai/analyze'
import { sendCandidateEmail } from '@/lib/email/send'
import type { FormQaItem } from '@/lib/cv/form-responses'
import { formResponsesToAiContext } from '@/lib/cv/form-responses'

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

async function extractCvText(buffer: Buffer, mimeType: string): Promise<string> {
  const mt = mimeType.toLowerCase()
  if (mt === 'application/pdf' || mt.endsWith('/pdf')) {
    const p = await import('pdf-parse')
    // pdf-parse: default vs namespace export varies by bundler
    const pdfParse = (p as { default?: (b: Buffer) => Promise<{ text: string }> }).default ?? (p as unknown as (b: Buffer) => Promise<{ text: string }>)
    const pdfData = await pdfParse(buffer)
    return pdfData.text || ''
  }
  return buffer.toString('utf-8')
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

export async function processCandidateAI(
  supabase: SupabaseClient,
  candidateId: string,
  name: string,
  email: string,
  buffer: Buffer | null,
  mimeType: string,
  cvUrl: string | null,
  jobId: string,
  formResponses?: FormQaItem[] | null
): Promise<void> {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('cultural_criteria, technical_criteria, description')
      .eq('id', jobId)
      .single()

    if (jobError || !job) return

    const cvText =
      buffer && buffer.length > 0 ? await extractCvText(buffer, mimeType) : NO_CV_PLACEHOLDER_PT
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

    if (updateError) console.error('Candidate Update Error:', updateError)

    const calendlyPlaceholder = `https://calendly.com/maverick360/interview-${jobId}`
    await sendCandidateEmail(email, name, newStatus, calendlyPlaceholder)
  } catch (error) {
    console.error('AI Processing Error:', error)
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
