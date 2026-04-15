import type { FormQaItem } from '@/lib/cv/form-responses'

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

function normalizeQuestionTitle(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Nome a partir do texto da pergunta (ex.: "Nome Completo", "Nome").
 * Prioriza rótulos explícitos sobre heurísticas genéricas.
 */
export function extractNameFromFormLabels(items: FormQaItem[]): string | null {
  const scored: { score: number; value: string }[] = []

  for (const row of items) {
    const qRaw = row.question?.trim() ?? ''
    const q = normalizeQuestionTitle(qRaw)
    const v = row.answer?.trim() ?? ''
    if (!v || EMAIL_RE.test(v) || v.length > 200) continue

    if (/\b(e-?mail|endereço\s+de\s+e-?mail|endereco\s+de\s+e-?mail)\b/i.test(qRaw)) continue
    if (/\bnome\s+(da|de|do)\s+(empresa|fantasia|razão|razao)\b/i.test(q)) continue

    let score = 0
    if (q === 'nome completo') score = 100
    else if (q === 'nome') score = 90
    else if (/\bnome\s+completo\b/.test(q)) score = 85
    else if (
      /\b(nome\s+civil|seu\s+nome|qual\s+(é|e)\s+o\s+seu\s+nome|qual\s+(é|e)\s+seu\s+nome|full\s*name)\b/i.test(
        q
      )
    )
      score = 80
    else if (/\bnome\b/.test(q) && !/\b(usuario|usuário|utilizador|login)\b/.test(q)) score = 35

    if (score > 0) scored.push({ score, value: v })
  }

  if (!scored.length) return null
  scored.sort((a, b) => b.score - a.score)
  return scored[0].value
}

/**
 * Telefone a partir do rótulo (Telefone, Celular, WhatsApp, etc.).
 * Não exige quantidade mínima de dígitos — grava o que veio na resposta.
 */
export function extractPhoneFromFormLabels(items: FormQaItem[]): string | null {
  const phoneQ =
    /\b(telefone|celular|whatsapp|whats\s*app|phone|fone|mobile|tel\.?|número|numero|contato\s+telef[oô]nico)\b/i
  for (const row of items) {
    if (!phoneQ.test(row.question ?? '')) continue
    const v = row.answer?.trim() ?? ''
    if (!v) continue
    if (EMAIL_RE.test(v)) continue
    return v
  }
  return null
}

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

  let phone = extractPhoneFromFormLabels(items)
  if (!phone) {
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

  let name = extractNameFromFormLabels(items) ?? ''
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
