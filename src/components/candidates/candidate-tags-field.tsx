'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTag } from '@/app/actions/tags'
import { TagColorSwatch } from '@/components/candidates/tag-chip'
import type { CandidateTagOption } from '@/lib/candidates/tag-types'

type Props = {
  allTags: CandidateTagOption[]
  initialSelectedIds: string[]
}

export function CandidateTagsField({ allTags, initialSelectedIds }: Props) {
  const router = useRouter()
  const [extraTags, setExtraTags] = useState<CandidateTagOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds))
  const [newName, setNewName] = useState('')
  const [inlineHasColor, setInlineHasColor] = useState(false)
  const [inlineHex, setInlineHex] = useState('#0f766e')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const displayTags = useMemo(() => {
    const seen = new Set(allTags.map((t) => t.id))
    return [...allTags, ...extraTags.filter((t) => !seen.has(t.id))]
  }, [allTags, extraTags])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCreate = async () => {
    setCreateError(null)
    const name = newName.trim()
    if (!name) {
      setCreateError('Escreva o nome da nova etiqueta.')
      return
    }
    setCreating(true)
    try {
      const res = await createTag(name, inlineHasColor ? inlineHex : null)
      if ('error' in res && res.error) {
        setCreateError(res.error)
        setCreating(false)
        return
      }
      if ('tag' in res && res.tag) {
        setExtraTags((prev) => [...prev, res.tag])
        setSelected((prev) => new Set(prev).add(res.tag.id))
        setNewName('')
        setInlineHasColor(false)
        setInlineHex('#0f766e')
        setShowCreate(false)
        router.refresh()
      }
    } catch {
      setCreateError('Falha ao criar etiqueta.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-[#FAFAFA]/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">Etiquetas</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs rounded-lg" asChild>
          <Link href="/dashboard/tags">Abrir catálogo</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha etiquetas do catálogo. Pode criar uma nova aqui ou no catálogo completo.
      </p>

      {[...selected].map((id) => (
        <input key={id} type="hidden" name="tag_id" value={id} />
      ))}

      {displayTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {displayTags.map((tag) => (
            <label
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-[#0F766E]/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(tag.id)}
                onChange={() => toggle(tag.id)}
                className="rounded border-border text-[#0F766E] focus:ring-[#0F766E]/30"
              />
              <TagColorSwatch color={tag.color} />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Ainda não há etiquetas. Crie a primeira abaixo.</p>
      )}

      <div className="border-t border-border/40 pt-3 space-y-2">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          {showCreate ? 'Fechar criação' : 'Criar nova etiqueta'}
        </button>
        {showCreate && (
          <div className="rounded-lg border border-border/60 bg-white p-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inline-new-tag-name" className="text-xs font-semibold">
                Nome
              </Label>
              <Input
                id="inline-new-tag-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex.: Entrevista técnica ok"
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Cor (opcional)</span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={inlineHasColor}
                    onChange={(e) => setInlineHasColor(e.target.checked)}
                    className="rounded border-border text-[#0F766E] focus:ring-[#0F766E]/30"
                  />
                  Definir cor
                </label>
                {inlineHasColor && (
                  <>
                    <input
                      id="inline-new-tag-color"
                      type="color"
                      value={inlineHex}
                      onChange={(e) => setInlineHex(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                      title="Cor da etiqueta"
                      aria-label="Selecionar cor da etiqueta"
                    />
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tabular-nums">{inlineHex}</span>
                  </>
                )}
              </div>
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg text-xs"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? 'A criar…' : 'Criar e selecionar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
