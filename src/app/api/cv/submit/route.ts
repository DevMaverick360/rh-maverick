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
  cvSupportedForAiAnalysis,
} from '@/lib/cv/ingest-pipeline'
import {
  extractContactFromFormResponses,
  extractNameFromFormLabels,
  extractPhoneFromFormLabels,
} from '@/lib/cv/extract-contact-from-form'
import { INTEGRATION_TOKEN } from '@/lib/cv/integration-token'
import { parseFormResponses, parseFormResponsesFromJsonString } from '@/lib/cv/form-responses'

const CV_MAX_BYTES = 10 * 1024 * 1024

function assertIngestAuthorized(req: Request): NextResponse | null {
  const envSecret = process.env.CV_INGEST_SECRET?.trim() || ''
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  const header = req.headers.get('x-cv-ingest-secret')
  const token = bearer || header?.trim()

  const allowed = new Set<string>([INTEGRATION_TOKEN])
  if (envSecret) allowed.add(envSecret)

  if (!token || !allowed.has(token)) {
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
  /** Alias (ex.: e-mail do inquirido no Google Forms quando "Recolher e-mails" está ativo) */
  respondent_email?: string
  phone?: string
  job_id?: string
  job_code?: string
  cv_base64?: string
  cv_filename?: string
  cv_mime_type?: string
  cv_url?: string
  /** Pares pergunta/resposta — qualquer formulário (Google Forms, etc.) */
  form_responses?: unknown
  /** Alias de form_responses (mesmo formato) */
  form_submission?: unknown
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

  const jobResolved = await resolveJobId(supabase, body.job_id, body.job_code)
  if ('error' in jobResolved) {
    return NextResponse.json({ error: jobResolved.error }, { status: 400 })
  }

  const rawForm = body.form_responses ?? body.form_submission
  const parsedForm = parseFormResponses(rawForm)
  if (parsedForm && 'error' in parsedForm) {
    return NextResponse.json({ error: parsedForm.error }, { status: 400 })
  }

  let name = body.name?.trim() ?? ''
  let email = body.email?.trim() || body.respondent_email?.trim() || ''
  let phone: string | null = body.phone?.trim() || null

  const needsInference = !name || !email || !phone
  if (needsInference && parsedForm?.length) {
    const extracted = extractContactFromFormResponses(parsedForm)
    if ('error' in extracted) {
      // Se e-mail já veio no JSON (ex.: getRespondentEmail no Apps Script), não exigir regex nas respostas
      if (!email) {
        return NextResponse.json({ error: extracted.error }, { status: 400 })
      }
    } else {
      if (!name) name = extracted.name
      if (!email) email = extracted.email
      if (!phone) phone = extracted.phone
    }
  }

  if (!name && email) {
    name = 'Candidato'
  }

  if (parsedForm?.length) {
    const labelName = extractNameFromFormLabels(parsedForm)
    const labelPhone = extractPhoneFromFormLabels(parsedForm)
    if (labelName) name = labelName
    if (labelPhone) phone = labelPhone
  }

  if (!name || !email) {
    return NextResponse.json(
      {
        error:
          'Informe name e email no JSON, ou envie form_responses (array de { question, answer }) com todas as respostas do formulário para inferência automática.',
      },
      { status: 400 }
    )
  }

  let buffer: Buffer | null = null
  let mimeType = 'application/octet-stream'
  let fileName = 'curriculo.pdf'

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
  }

  let cvUrl: string | null = null
  if (buffer && buffer.length > 0) {
    if (!cvSupportedForAiAnalysis(mimeType, fileName)) {
      return NextResponse.json(
        {
          error:
            'CV não suportado para análise de IA. Envie PDF ou Word (.doc, .docx). Defina cv_filename com extensão correta (ex.: candidato.docx) se cv_mime_type for genérico.',
        },
        { status: 400 }
      )
    }
    const uploaded = await uploadCvBuffer(supabase, buffer, fileName, mimeType)
    if ('error' in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 500 })
    }
    cvUrl = uploaded.cvUrl
  }

  const inserted = await insertCandidateRow(supabase, {
    name,
    email,
    phone,
    jobId: jobResolved.id,
    cvUrl,
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
    cvUrl,
    jobResolved.id,
    parsedForm,
    fileName
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
  let name = ((formData.get('name') as string) ?? '').trim()
  let email = ((formData.get('email') as string) ?? '').trim()
  let phone: string | null = ((formData.get('phone') as string) ?? '').trim() || null
  const jobIdRaw = formData.get('job_id') as string | null
  const jobCodeRaw = formData.get('job_code') as string | null
  const formResponsesRaw =
    (formData.get('form_responses') as string | null) ?? (formData.get('form_submission') as string | null)
  const cvFile = formData.get('cv') as File | null

  const jobResolved = await resolveJobId(supabase, jobIdRaw ?? undefined, jobCodeRaw ?? undefined)
  if ('error' in jobResolved) {
    return NextResponse.json({ error: jobResolved.error }, { status: 400 })
  }

  const parsedFormMultipart = parseFormResponsesFromJsonString(formResponsesRaw)
  if (parsedFormMultipart && 'error' in parsedFormMultipart) {
    return NextResponse.json({ error: parsedFormMultipart.error }, { status: 400 })
  }

  const needsInference = !name || !email || !phone
  if (needsInference && parsedFormMultipart?.length) {
    const extracted = extractContactFromFormResponses(parsedFormMultipart)
    if ('error' in extracted) {
      if (!name || !email) {
        return NextResponse.json({ error: extracted.error }, { status: 400 })
      }
    } else {
      if (!name) name = extracted.name
      if (!email) email = extracted.email
      if (!phone) phone = extracted.phone
    }
  }

  if (!name && email) {
    name = 'Candidato'
  }

  if (parsedFormMultipart?.length) {
    const labelName = extractNameFromFormLabels(parsedFormMultipart)
    const labelPhone = extractPhoneFromFormLabels(parsedFormMultipart)
    if (labelName) name = labelName
    if (labelPhone) phone = labelPhone
  }

  if (!name || !email) {
    return NextResponse.json(
      {
        error:
          'Campos obrigatórios: name e email, ou form_responses (JSON) com as respostas do formulário para inferência.',
      },
      { status: 400 }
    )
  }

  let buffer: Buffer | null = null
  let mimeType = 'application/octet-stream'
  let fileName = 'curriculo.pdf'

  if (cvFile && cvFile instanceof File && cvFile.size > 0) {
    if (cvFile.size > CV_MAX_BYTES) {
      return NextResponse.json({ error: 'CV excede o tamanho máximo (10MB)' }, { status: 400 })
    }
    const arrayBuffer = await cvFile.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
    mimeType = cvFile.type || 'application/octet-stream'
    fileName = cvFile.name || 'curriculo.pdf'
  }

  let cvUrl: string | null = null
  if (buffer && buffer.length > 0) {
    if (!cvSupportedForAiAnalysis(mimeType, fileName)) {
      return NextResponse.json(
        {
          error:
            'CV não suportado para análise de IA. Envie PDF ou Word (.doc, .docx) com extensão correta no nome do ficheiro.',
        },
        { status: 400 }
      )
    }
    const uploaded = await uploadCvBuffer(supabase, buffer, fileName, mimeType)
    if ('error' in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 500 })
    }
    cvUrl = uploaded.cvUrl
  }

  const inserted = await insertCandidateRow(supabase, {
    name,
    email,
    phone,
    jobId: jobResolved.id,
    cvUrl,
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
    cvUrl,
    jobResolved.id,
    parsedFormMultipart,
    fileName
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
    auth: {
      required: true,
      headers: [
        'Authorization: Bearer <token de integração>',
        'ou x-cv-ingest-secret: <token de integração>',
      ],
      note: 'Token fixo de integração embutido na API ou CV_INGEST_SECRET no servidor (se definido; ambos são aceitos).',
    },
    supabase: {
      service_role:
        'Recomendado: SUPABASE_SERVICE_ROLE_KEY para upload/storage sem sessão do candidato.',
    },
    json: {
      contentType: 'application/json',
      plugAndPlay: {
        description:
          'Pode omitir name, email e phone se enviar form_responses (ou form_submission) com as respostas do Google Form — o servidor infere contato. O CV (cv_base64 ou cv_url) é opcional: candidaturas só com formulário são aceites.',
        required: ['job_id OU job_code', 'form_responses OU (name E email)'],
      },
      required: ['job_id OU job_code'],
      optional: [
        'cv_base64, cv_filename, cv_mime_type — ou cv_url (HTTPS). Análise de IA: PDF, Word .doc / .docx (e .txt); use cv_filename com extensão correta se o MIME for genérico.',
        'name, email, respondent_email (alias), phone — se omitidos em parte, use form_responses para inferência',
        'form_responses OU form_submission: array de { question: string, answer: string }',
      ],
      job_code:
        'Código cadastrado no painel na vaga (minúsculas; ex.: frontend-sp). Alternativa ao UUID job_id.',
    },
    multipart: {
      contentType: 'multipart/form-data',
      fields: ['job_id OU job_code'],
      optional: [
        'cv (file) — opcional; PDF ou Word (.doc, .docx) para análise de IA',
        'name, email, phone — ou form_responses / form_submission (string JSON) para inferência',
      ],
    },
  })
}
