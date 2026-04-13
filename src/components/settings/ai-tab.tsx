'use client'

import { useState } from 'react'
import { updateAISettings } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, CheckCircle, Brain, Thermometer } from 'lucide-react'

interface AITabProps {
  settings: {
    system_prompt: string
    model: string
    temperature: number
  } | null
}

export function AITab({ settings }: AITabProps) {
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [temperature, setTemperature] = useState(settings?.temperature ?? 0.3)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setErr(null)
    setMsg(null)
    formData.set('temperature', temperature.toString())
    const result = await updateAISettings(formData)
    if (result?.error) setErr(result.error)
    else setMsg('Configurações da IA salvas.')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-6">
        {/* System Prompt */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF3B3B] to-[#CC2222]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Prompt do Sistema</h3>
              <p className="text-xs text-muted-foreground">
                Instrução principal enviada à IA para análise de currículos.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system_prompt" className="text-sm font-semibold">Prompt</Label>
              <Textarea
                id="system_prompt"
                name="system_prompt"
                defaultValue={settings?.system_prompt || ''}
                placeholder="Você é um especialista em RH. Analise o currículo..."
                className="min-h-[200px] rounded-lg border-border px-4 py-3 text-sm font-mono resize-none transition-colors focus:border-[#FF3B3B]"
              />
              <p className="text-[11px] text-muted-foreground">
                Esse prompt será concatenado com os critérios técnicos e culturais de cada vaga.
              </p>
            </div>
          </div>
        </div>

        {/* Model & Temperature */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-[#FAFAFA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066FF] to-[#0044CC]">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Modelo e Parâmetros</h3>
              <p className="text-xs text-muted-foreground">Controle qual modelo e temperatura usar.</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-semibold flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-[#0066FF]" />
                  Modelo OpenAI
                </Label>
                <select
                  id="model"
                  name="model"
                  defaultValue={settings?.model || 'gpt-4o-mini'}
                  className="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (rápido, econômico)</option>
                  <option value="gpt-4o">GPT-4o (mais preciso)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (mais rápido)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-[#FF3B3B]" />
                  Temperatura: <span className="text-[#FF3B3B]">{temperature}</span>
                </Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#FF3B3B] bg-[#E0E0E0]"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Preciso (0)</span>
                  <span>Criativo (1)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {msg && (
          <div className="flex items-center gap-2 text-sm font-medium text-[#22C55E]">
            <CheckCircle className="h-4 w-4" /> {msg}
          </div>
        )}
        {err && <p className="text-sm font-medium text-destructive">{err}</p>}

        <Button type="submit" disabled={loading} className="rounded-lg font-semibold h-10 px-6">
          {loading ? 'Salvando...' : 'Salvar Configurações da IA'}
        </Button>
      </form>
    </div>
  )
}
