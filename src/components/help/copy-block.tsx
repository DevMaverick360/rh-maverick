'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

type CopyBlockProps = {
  label: string
  description?: string
  value: string
  className?: string
  multiline?: boolean
}

export function CopyBlock({ label, description, value, className, multiline }: CopyBlockProps) {
  const [done, setDone] = useState(false)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setDone(false)
    }
  }, [value])

  return (
    <div className={cn('rounded-xl border border-border/60 bg-[#FAFAFA] overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs font-semibold"
          onClick={copy}
        >
          {done ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#22C55E]" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre
        className={cn(
          'p-4 text-xs leading-relaxed overflow-x-auto text-foreground/90 font-mono bg-[#0B0B0B]/[0.03]',
          multiline ? 'whitespace-pre-wrap break-all' : ''
        )}
      >
        {value}
      </pre>
    </div>
  )
}
