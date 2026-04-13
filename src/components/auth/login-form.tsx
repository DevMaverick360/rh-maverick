'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0B0B0B] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cuc3ZnLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxMC45NDEgMCAxOC04LjA1OSAxOC0xOHMtNy4wNTktMTgtMTgtMTh6TTM2IDM0Yy0uNTUyIDAtMS0uNDQ4LTEtMXMuNDQ4LTEgMS0xIDEgLjQ0OCAxIDEtLjQ0OCAxLTEgMXoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">Maverick 360</h1>
          <p className="text-sm text-gray-400 mt-1">AI HR Automation</p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Automatize seu<br />recrutamento com IA.
          </h2>
          <div className="grid gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Zap className="h-5 w-5 text-[#FF3B3B]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Análise em segundos</h3>
                <p className="text-sm text-gray-400">CVs processados e pontuados pela IA automaticamente.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Shield className="h-5 w-5 text-[#0066FF]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Critérios sob controle</h3>
                <p className="text-sm text-gray-400">Defina o perfil técnico e cultural de cada vaga.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <TrendingUp className="h-5 w-5 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Dashboard em tempo real</h3>
                <p className="text-sm text-gray-400">Pipeline visual com métricas que importam.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-gray-500">© 2026 Maverick 360 — Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight lg:hidden">Maverick 360</h1>
            <h2 className="text-2xl font-bold tracking-tight">Acessar Painel</h2>
            <p className="text-muted-foreground text-sm">Entre com suas credenciais para continuar</p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-foreground focus:ring-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 rounded-lg border-border px-4 text-sm transition-colors focus:border-foreground focus:ring-foreground"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <Button className="w-full h-11 rounded-lg font-semibold text-sm" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-semibold text-foreground hover:text-accent transition-colors">
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
