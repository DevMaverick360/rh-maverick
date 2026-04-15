'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateProfile, updatePassword } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, CheckCircle, Sparkles } from 'lucide-react'

interface ProfileTabProps {
  profile: { full_name: string | null } | null
  email: string
}

export function ProfileTab({ profile, email }: ProfileTabProps) {
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleProfile(formData: FormData) {
    setProfileLoading(true)
    setProfileErr(null)
    setProfileMsg(null)
    const result = await updateProfile(formData)
    if (result?.error) setProfileErr(result.error)
    else setProfileMsg('Perfil atualizado.')
    setProfileLoading(false)
  }

  async function handlePassword(formData: FormData) {
    setPwLoading(true)
    setPwErr(null)
    setPwMsg(null)
    const result = await updatePassword(formData)
    if (result?.error) setPwErr(result.error)
    else setPwMsg('Senha alterada com sucesso.')
    setPwLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0B]">
            <User className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Dados do Perfil</h3>
            <p className="text-xs text-muted-foreground">Informações básicas da conta.</p>
          </div>
        </div>
        <form action={handleProfile} className="p-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold">Nome completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || ''}
                placeholder="Seu nome"
                className="h-11 rounded-lg border-border px-4 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">E-mail</Label>
              <Input
                value={email}
                disabled
                className="h-11 rounded-lg border-border px-4 text-sm bg-[#F5F5F5] text-muted-foreground"
              />
            </div>
          </div>
          {profileMsg && (
            <div className="flex items-center gap-2 text-sm font-medium text-[#22C55E]">
              <CheckCircle className="h-4 w-4" /> {profileMsg}
            </div>
          )}
          {profileErr && <p className="text-sm font-medium text-destructive">{profileErr}</p>}
          <Button type="submit" disabled={profileLoading} className="rounded-lg font-semibold h-10 px-6">
            {profileLoading ? 'Salvando...' : 'Salvar Perfil'}
          </Button>
        </form>
      </div>

      {/* IA — candidatos */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/15">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Análise de candidatos (IA)</h3>
            <p className="text-xs text-muted-foreground">
              Scores, resumos e respostas de formulário após o processamento automático.
            </p>
          </div>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground max-w-md">
            Abra a lista de candidatos e escolha um registo para ver o detalhe e a análise gerada pela IA.
          </p>
          <Button
            variant="outline"
            className="h-10 rounded-lg font-semibold shrink-0 border-[#7C3AED]/30 text-[#7C3AED] hover:bg-[#7C3AED]/5"
            asChild
          >
            <Link href="/dashboard/candidates">
              <Sparkles className="h-4 w-4 mr-2" />
              Ver candidatos e IA
            </Link>
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066FF] to-[#0044CC]">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Alterar Senha</h3>
            <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>
        </div>
        <form action={handlePassword} className="p-6 space-y-5">
          <div className="max-w-sm space-y-2">
            <Label htmlFor="new_password" className="text-sm font-semibold">Nova senha</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="h-11 rounded-lg border-border px-4 text-sm"
            />
          </div>
          {pwMsg && (
            <div className="flex items-center gap-2 text-sm font-medium text-[#22C55E]">
              <CheckCircle className="h-4 w-4" /> {pwMsg}
            </div>
          )}
          {pwErr && <p className="text-sm font-medium text-destructive">{pwErr}</p>}
          <Button type="submit" disabled={pwLoading} className="rounded-lg font-semibold h-10 px-6">
            {pwLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </div>
    </div>
  )
}
