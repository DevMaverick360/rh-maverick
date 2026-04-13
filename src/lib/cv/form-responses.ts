export type FormQaItem = { question: string; answer: string }

const MAX_ITEMS = 80
const MAX_QUESTION_LEN = 4000
const MAX_ANSWER_LEN = 20000
const MAX_PAYLOAD_BYTES = 240_000

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

/** Normaliza e valida payload vindo da API (Google Forms / integrações). */
export function parseFormResponses(raw: unknown): FormQaItem[] | { error: string } | null {
  if (raw === undefined || raw === null) return null
  if (!Array.isArray(raw)) {
    return { error: 'form_responses deve ser um array de { question, answer }' }
  }
  if (raw.length > MAX_ITEMS) {
    return { error: `form_responses: no máximo ${MAX_ITEMS} itens` }
  }

  const out: FormQaItem[] = []
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]
    if (row === null || typeof row !== 'object') {
      return { error: `form_responses[${i}]: objeto esperado` }
    }
    const rec = row as Record<string, unknown>
    const q = rec.question == null ? '' : String(rec.question)
    const a = rec.answer == null ? '' : String(rec.answer)
    const question = truncate(q.trim(), MAX_QUESTION_LEN)
    const answer = truncate(a.trim(), MAX_ANSWER_LEN)
    if (!question && !answer) continue
    out.push({ question: question || '(sem título da pergunta)', answer })
  }

  const json = JSON.stringify(out)
  if (json.length > MAX_PAYLOAD_BYTES) {
    return { error: 'form_responses excede o tamanho máximo permitido' }
  }

  return out.length ? out : null
}

export function parseFormResponsesFromJsonString(str: string | null | undefined): FormQaItem[] | { error: string } | null {
  if (!str?.trim()) return null
  try {
    const parsed = JSON.parse(str) as unknown
    return parseFormResponses(parsed)
  } catch {
    return { error: 'form_responses: JSON inválido' }
  }
}

/** Texto extra para o prompt da IA (além do CV). */
export function formResponsesToAiContext(items: FormQaItem[] | null): string {
  if (!items?.length) return ''
  const lines = items.map(
    (item, idx) =>
      `--- Pergunta ${idx + 1} ---\n${item.question}\nResposta:\n${item.answer}`
  )
  const block = lines.join('\n\n')
  return block.length > 12000 ? `${block.slice(0, 12000)}…` : block
}
