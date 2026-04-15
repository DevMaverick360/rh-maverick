import type { FormQaItem } from '@/lib/cv/form-responses'

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

function firstEmailInAnswers(items: FormQaItem[]): { email: string; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    const raw = items[i].answer?.trim() ?? ''
    if (!raw) continue
    const m = raw.match(EMAIL_RE)
    if (m) return { email: m[0], index: i }
  }
  return null
}

function looksLikePhoneDigits(answer: string): boolean {
  const digits = answer.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return false
  if (answer.includes('@')) return false
  return true
}

/**
 * Infere nome, e-mail e telefone a partir do array genérico do Google Form
 * (pergunta/resposta). Usado no modo plug-and-play quando name/email não vêm no JSON.
 *
 * Regras: e-mail obrigatório (regex em alguma resposta). Nome e telefone são best-effort.
 */
export function extractContactFromFormResponses(
  items: FormQaItem[]
): { name: string; email: string; phone: string | null } | { error: string } {
  if (!items.length) {
    return {
      error:
        'Envie form_responses (array de { question, answer }) com as respostas do formulário, ou informe name e email no JSON.',
    }
  }

  const found = firstEmailInAnswers(items)
  if (!found) {
    return {
      error:
        'Não foi possível detectar um e-mail nas respostas de texto. No Google Forms: ative "Recolher endereços de e-mail dos inquiridos" (o script Maverick envia esse e-mail no JSON), ou use pergunta de validação de e-mail, ou envie "email" / "respondent_email" no JSON.',
    }
  }

  const { email, index: emailIndex } = found

  let phone: string | null = null
  const phoneTitle = /\b(telefone|celular|whatsapp|phone|fone|mobile)\b/i
  for (const row of items) {
    if (phoneTitle.test(row.question)) {
      const v = row.answer?.trim() ?? ''
      if (v && looksLikePhoneDigits(v)) {
        phone = v
        break
      }
    }
  }
  if (!phone) {
    for (let i = 0; i < items.length; i++) {
      if (i === emailIndex) continue
      const v = items[i].answer?.trim() ?? ''
      if (!v || v === email) continue
      if (EMAIL_RE.test(v)) continue
      if (looksLikePhoneDigits(v) && v.length < 40) {
        phone = v
        break
      }
    }
  }

  let name = ''
  const nameTitle =
    /\b(nome\s+completo|nome\s+civil|seu\s+nome|full\s*name|name)\b/i
  for (const row of items) {
    if (nameTitle.test(row.question) && !/\b(e-?mail|email)\b/i.test(row.question)) {
      const v = row.answer?.trim() ?? ''
      if (v && !EMAIL_RE.test(v) && v.length <= 200) {
        name = v
        break
      }
    }
  }

  if (!name) {
    for (let i = 0; i < items.length; i++) {
      if (i === emailIndex) continue
      const v = items[i].answer?.trim() ?? ''
      if (!v || v === email) continue
      if (EMAIL_RE.test(v)) continue
      if (looksLikePhoneDigits(v)) continue
      if (v.length > 200) continue
      if (phone && v === phone) continue
      if (v.length >= 2) {
        name = v
        break
      }
    }
  }

  if (!name) {
    name = 'Candidato'
  }

  return { name, email, phone }
}
