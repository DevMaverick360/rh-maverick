import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Ponto de cor para listas com checkbox (opcional). */
export function TagColorSwatch({
  color,
  className,
}: {
  color: string | null | undefined
  className?: string
}) {
  const raw = color?.trim()
  if (!raw || !/^#[0-9a-fA-F]{6}$/i.test(raw)) return null
  return (
    <span
      className={cn('h-2.5 w-2.5 shrink-0 rounded-sm border border-border/60', className)}
      style={{ backgroundColor: raw }}
      aria-hidden
    />
  )
}

function chipStyle(color: string | null | undefined): CSSProperties | undefined {
  const raw = color?.trim()
  if (!raw || !/^#[0-9a-fA-F]{6}$/i.test(raw)) return undefined
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return {
    backgroundColor: `rgba(${r},${g},${b},0.16)`,
    borderColor: `rgba(${r},${g},${b},0.42)`,
    color: hex.toLowerCase(),
  }
}

const baseClass =
  'inline-flex max-w-[11rem] shrink-0 items-center truncate rounded-md border border-solid text-[10px] font-medium leading-none'

/** Etiqueta com cor do catálogo (fundo/borda/texto); sem cor válida usa estilo neutro. */
export function TagChip({
  name,
  color,
  className,
  size = 'sm',
}: {
  name: string
  color?: string | null
  className?: string
  /** sm: lista; md: cabeçalho detalhe */
  size?: 'sm' | 'md'
}) {
  const s = chipStyle(color)
  const pad = size === 'md' ? 'h-5 px-2 py-0.5 text-[10px]' : 'h-5 px-1.5 py-0 text-[10px]'
  return (
    <span
      className={cn(
        baseClass,
        pad,
        s ? '' : 'border-border/70 bg-muted/70 text-foreground',
        className
      )}
      style={s}
      title={name}
    >
      {name}
    </span>
  )
}
