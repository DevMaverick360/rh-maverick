'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CandidateAiRerunButton({
  candidateId,
  disabled,
}: {
  candidateId: string
  /** Sem vaga associada ou outro motivo para bloquear */
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function run() {
    setFeedback(null)
    startTransition(async () => {
      const res = await fetch(`/api/dashboard/candidates/${encodeURIComponent(candidateId)}/rerun-ai`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      let body: { ok?: boolean; error?: string } = {}
      try {
        body = (await res.json()) as { ok?: boolean; error?: string }
      } catch {
        setFeedback({ kind: 'err', text: 'Resposta inválida do servidor.' })
        return
      }
      if (!res.ok) {
        setFeedback({ kind: 'err', text: body.error ?? `Erro ${res.status}` })
        return
      }
      setFeedback({ kind: 'ok', text: 'Análise concluída com os critérios atuais da vaga.' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-lg font-semibold shrink-0"
        disabled={disabled || pending}
        onClick={run}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" aria-hidden />
        )}
        Analisar candidato com a IA (vaga)
      </Button>
      {feedback && (
        <p
          role="status"
          className={
            feedback.kind === 'ok'
              ? 'text-xs text-[#15803D] font-medium text-right'
              : 'text-xs text-destructive font-medium text-right max-w-[280px] sm:max-w-xs'
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  )
}
