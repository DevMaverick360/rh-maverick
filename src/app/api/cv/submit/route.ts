import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  bufferFromBase64,
  fetchCvFromUrl,
  insertCandidateRow,
  processCandidateAI,
  resolveJobId,
  uploadCvBuffer,
} from '@/lib/cv/ingest-pipeline'
import { parseFormResponses, parseFormResponsesFromJsonString } from '@/lib/cv/form-responses'

const CV_MAX_BYTES = 10 * 1024 * 1024

function assertIngestAuthorized(req: Request): NextResponse | null {
  const secret = process.env.CV_INGEST_SECRET
  if (!secret) return null
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  const header = req.headers.get('x-cv-ingest-secret')
  const token = bearer || header?.trim()
  if (!token || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

async function getSupabaseForIngest() {
  const sr = createServiceRoleClient()
  if (sr) return sr
  return createClient()
}

type JsonBody = {
  name?: string
  email?: string
  phone?: string
  job_id?: string
  job_code?: string
  cv_base64?: string
  cv_filename?: string
  cv_mime_type?: string
  cv_url?: string
  /** Pares pergunta/resposta (ex.: Google Forms) */
  form_responses?: unknown
}

export async function POST(req: Request) {
  const unauthorized = assertIngestAuthorized(req)
  if (unauthorized) return unauthorized

  try {
    const supabase = await getSupabaseForIngest()
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return handleJsonIngest(req, supabase)
    }

    if (contentType.includes('multipart/form-data')) {
      return handleMultipartIngest(req, supabase)
    }

    return NextResponse.json(
      { error: 'Use Content-Type application/json ou multipart/form-data' },
      { status: 415 }
    )
  } catch (error) {
    console.error('Submission Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function handleJsonIngest(req: Request, supabase: Awaited<ReturnType<typeof getSupabaseForIngest>>) {
  let body: JsonBody
  try {
    body = (await req.json()) as JsonBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const name = body.name?.trim()
  const email = body.email?.trim()
  if (!name || !email) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, email' }, { status: 400 })
  }

  const jobResolved = await resolveJobId(supabase, body.job_id, body.job_code)
  if ('error' in jobResolved) {
    return NextResponse.json({ error: jobResolved.error }, { status: 400 })
  }

  const parsedForm = parseFormResponses(body.form_responses)
  if (parsedForm && 'error' in parsedForm) {
    return NextResponse.json({ error: parsedForm.error }, { status: 400 })
  }

  let buffer: Buffer
  let mimeType: string
  let fileName: string

  if (body.cv_url?.trim()) {
    const fetched = await fetchCvFromUrl(body.cv_url.trim())
    if ('error' in fetched) return NextResponse.json({ error: fetched.error }, { status: 400 })
    buffer = fetched.buffer
    mimeType = fetched.mimeType
    fileName = body.cv_filename?.trim() || fetched.name
  } else if (body.cv_base64?.trim()) {
    const b = bufferFromBase64(body.cv_base64.trim())
    if ('error' in b) return NextResponse.json({ error: b.error }, { status: 400 })
    buffer = b
    mimeType = body.cv_mime_type?.trim() || 'application/pdf'
    fileName = body.cv_filename?.trim() || 'curriculo.pdf'
  } else {
    return NextResponse.json(
      { error: 'Informe cv_base64 (+ cv_filename) ou cv_url (HTTPS)' },
      { status: 400 }
    )
  }

  const uploaded = await uploadCvBuffer(supabase, buffer, fileName, mimeType)
  if ('error' in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 })
  }

  const inserted = await insertCandidateRow(supabase, {
    name,
    email,
    phone: body.phone?.trim() || null,
    jobId: jobResolved.id,
    cvUrl: uploaded.cvUrl,
    formResponses: parsedForm,
  })
  if ('error' in inserted) {
    return NextResponse.json({ error: inserted.error }, { status: 500 })
  }

  void processCandidateAI(
    supabase,
    inserted.id,
    name,
    email,
    buffer,
    mimeType,
    uploaded.cvUrl,
    jobResolved.id,
    parsedForm
  )

  return NextResponse.json(
    {
      message: 'Candidatura registrada com sucesso',
      candidateId: inserted.id,
      jobId: jobResolved.id,
    },
    { status: 201 }
  )
}

async function handleMultipartIngest(req: Request, supabase: Awaited<ReturnType<typeof getSupabaseForIngest>>) {
  const formData = await req.formData()
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || ''
  const jobIdRaw = formData.get('job_id') as string | null
  const jobCodeRaw = formData.get('job_code') as string | null
  const formResponsesRaw = formData.get('form_responses') as string | null
  const cvFile = formData.get('cv') as File | null

  if (!name || !email) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, email' }, { status: 400 })
  }

  const jobResolved = await resolveJobId(supabase, jobIdRaw ?? undefined, jobCodeRaw ?? undefined)
  if ('error' in jobResolved) {
    return NextResponse.json({ error: jobResolved.error }, { status: 400 })
  }

  const parsedFormMultipart = parseFormResponsesFromJsonString(formResponsesRaw)
  if (parsedFormMultipart && 'error' in parsedFormMultipart) {
    return NextResponse.json({ error: parsedFormMultipart.error }, { status: 400 })
  }

  if (!cvFile || !(cvFile instanceof File) || cvFile.size === 0) {
    return NextResponse.json({ error: 'Arquivo cv é obrigatório' }, { status: 400 })
  }
  if (cvFile.size > CV_MAX_BYTES) {
    return NextResponse.json({ error: 'CV excede o tamanho máximo (10MB)' }, { status: 400 })
  }

  const arrayBuffer = await cvFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = cvFile.type || 'application/octet-stream'
  const fileName = cvFile.name || 'curriculo.pdf'

  const uploaded = await uploadCvBuffer(supabase, buffer, fileName, mimeType)
  if ('error' in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 })
  }

  const inserted = await insertCandidateRow(supabase, {
    name,
    email,
    phone: phone || null,
    jobId: jobResolved.id,
    cvUrl: uploaded.cvUrl,
    formResponses: parsedFormMultipart,
  })
  if ('error' in inserted) {
    return NextResponse.json({ error: inserted.error }, { status: 500 })
  }

  void processCandidateAI(
    supabase,
    inserted.id,
    name,
    email,
    buffer,
    mimeType,
    uploaded.cvUrl,
    jobResolved.id,
    parsedFormMultipart
  )

  return NextResponse.json(
    {
      message: 'Candidatura registrada com sucesso',
      candidateId: inserted.id,
      jobId: jobResolved.id,
    },
    { status: 201 }
  )
}

/** Documentação do contrato para integrações (Google Forms, etc.) */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cv/submit',
    method: 'POST',
    auth: process.env.CV_INGEST_SECRET
      ? {
          required: true,
          headers: [
            'Authorization: Bearer <CV_INGEST_SECRET>',
            'ou x-cv-ingest-secret: <CV_INGEST_SECRET>',
          ],
        }
      : { required: false, note: 'Defina CV_INGEST_SECRET em produção.' },
    supabase: {
      service_role:
        'Recomendado: SUPABASE_SERVICE_ROLE_KEY para upload/storage sem sessão do candidato.',
    },
    json: {
      contentType: 'application/json',
      required: ['name', 'email', 'job_id OU job_code', 'cv_base64 OU cv_url'],
      optional: [
        'phone',
        'cv_filename',
        'cv_mime_type (default application/pdf com base64)',
        'form_responses: array de { question: string, answer: string } — texto da pergunta (título) e resposta do candidato',
      ],
      job_code:
        'Código cadastrado no painel na vaga (minúsculas; ex.: frontend-sp). Alternativa ao UUID job_id.',
    },
    multipart: {
      contentType: 'multipart/form-data',
      fields: ['name', 'email', 'cv (file)', 'job_id OU job_code'],
      optional: ['phone', 'form_responses (string JSON com o mesmo array da API JSON)'],
    },
  })
}
