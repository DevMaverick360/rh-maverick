'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createTag, deleteTag, updateTag, type TagRow } from '@/app/actions/tags'
import { slugifyTag } from '@/lib/slugify'

type Props = {
  initialTags: TagRow[]
  canManage: boolean
}

function colorInputValue(hex: string | null | undefined): string {
  const h = (hex ?? '').trim()
  if (/^#[0-9a-fA-F]{6}$/i.test(h)) return h.toLowerCase()
  return '#0f766e'
}

export function TagsCatalogClient({ initialTags, canManage }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState(initialTags)

  useEffect(() => {
    setTags(initialTags)
  }, [initialTags])
  const [name, setName] = useState('')
  const [tagHasColor, setTagHasColor] = useState(false)
  const [tagHex, setTagHex] = useState('#0f766e')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editHasColor, setEditHasColor] = useState(false)
  const [editHex, setEditHex] = useState('#0f766e')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const startEdit = (t: TagRow) => {
    setEditError(null)
    setEditingId(t.id)
    setEditName(t.name)
    if (t.color) {
      setEditHasColor(true)
      setEditHex(colorInputValue(t.color))
    } else {
      setEditHasColor(false)
      setEditHex('#0f766e')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = async (id: string) => {
    setEditError(null)
    setSavingId(id)
    try {
      const res = await updateTag(id, editName, editHasColor ? editHex : null)
      if ('error' in res && res.error) {
        setEditError(res.error)
        return
      }
      if ('tag' in res && res.tag) {
        setTags((prev) =>
          [...prev.filter((x) => x.id !== id), res.tag].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
        )
        setEditingId(null)
        router.refresh()
      }
    } finally {
      setSavingId(null)
    }
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await createTag(name, tagHasColor ? tagHex : null)
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      if ('tag' in res && res.tag) {
        setTags((prev) => [...prev, res.tag].sort((a, b) => a.name.localeCompare(b.name, 'pt')))
        setName('')
        setTagHasColor(false)
        setTagHex('#0f766e')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Eliminar esta etiqueta? Será removida de todos os candidatos.')) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await deleteTag(id)
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      setTags((prev) => prev.filter((t) => t.id !== id))
      setEditingId((prev) => (prev === id ? null : prev))
      setEditError((e) => (editingId === id ? null : e))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {canManage && (
        <form onSubmit={onCreate} className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E]">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Nova etiqueta</h3>
              <p className="text-xs text-muted-foreground">Nome único no catálogo; depois associe-a aos candidatos.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ex.: Prioridade alta"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Cor (opcional)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={tagHasColor}
                    onChange={(e) => setTagHasColor(e.target.checked)}
                    className="rounded border-border text-[#0F766E] focus:ring-[#0F766E]/30"
                  />
                  Definir cor
                </label>
                {tagHasColor && (
                  <>
                    <input
                      id="tag-color"
                      type="color"
                      value={tagHex}
                      onChange={(e) => setTagHex(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                      title="Cor da etiqueta"
                      aria-label="Selecionar cor da etiqueta"
                    />
                    <span className="font-mono text-xs text-muted-foreground uppercase tabular-nums">{tagHex}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="rounded-lg">
            {loading ? 'A guardar…' : 'Cadastrar etiqueta'}
          </Button>
        </form>
      )}

      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F5F5F5] hover:bg-[#F5F5F5]">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F]">Nome</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F]">Slug</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] w-24">Cor</TableHead>
              {canManage && (
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] w-[120px] text-right">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma etiqueta cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              tags.map((t) =>
                editingId === t.id ? (
                  <TableRow key={t.id} className="bg-[#FAFAFA]">
                    <TableCell className="align-top py-3">
                      <Label htmlFor={`edit-name-${t.id}`} className="sr-only">
                        Nome
                      </Label>
                      <Input
                        id={`edit-name-${t.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 rounded-lg text-sm max-w-xs"
                        autoFocus
                      />
                    </TableCell>
                    <TableCell className="align-top py-3">
                      <span className="text-xs text-muted-foreground font-mono block pt-2 break-all">
                        {slugifyTag(editName)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Slug ao guardar</span>
                    </TableCell>
                    <TableCell className="align-top py-3">
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={editHasColor}
                            onChange={(e) => setEditHasColor(e.target.checked)}
                            className="rounded border-border text-[#0F766E] focus:ring-[#0F766E]/30"
                          />
                          Cor
                        </label>
                        {editHasColor && (
                          <>
                            <input
                              type="color"
                              value={editHex}
                              onChange={(e) => setEditHex(e.target.value)}
                              className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                              title="Cor da etiqueta"
                              aria-label="Selecionar cor"
                            />
                            <span className="font-mono text-[10px] text-muted-foreground uppercase tabular-nums">
                              {editHex}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right align-top py-3">
                        <div className="flex flex-col items-end gap-1">
                          {editError && <p className="text-xs text-destructive text-right max-w-[10rem]">{editError}</p>}
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={savingId === t.id}
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={savingId === t.id || !editName.trim()}
                              onClick={() => void saveEdit(t.id)}
                            >
                              {savingId === t.id ? 'A guardar…' : 'Guardar'}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ) : (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">{t.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{t.slug}</TableCell>
                    <TableCell>
                      {t.color ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span
                            className="h-5 w-5 rounded border border-border shrink-0"
                            style={{ backgroundColor: t.color }}
                            title={t.color}
                          />
                          {t.color}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-[#0F766E]"
                            disabled={deletingId === t.id || editingId !== null}
                            onClick={() => startEdit(t)}
                            title="Editar etiqueta"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            disabled={deletingId === t.id}
                            onClick={() => void onDelete(t.id)}
                            title="Eliminar etiqueta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
