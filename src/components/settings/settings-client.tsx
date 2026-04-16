'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { User, Users, Sparkles, BookOpen } from 'lucide-react'
import { ProfileTab } from '@/components/settings/profile-tab'
import { UsersTab } from '@/components/settings/users-tab'
import { AITab } from '@/components/settings/ai-tab'
import { GoogleFormsHelp } from '@/components/help/google-forms-help'

interface SettingsClientProps {
  profile: { full_name: string | null } | null
  email: string
  currentUserId: string
  users: { id: string; full_name: string | null; role: string; created_at: string }[]
  aiSettings: { system_prompt: string; model: string; temperature: number } | null
  initialTab?: 'profile' | 'users' | 'ai' | 'integracao'
}

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'ai', label: 'Configuração IA', icon: Sparkles },
  { id: 'integracao', label: 'Integração', icon: BookOpen },
] as const

export function SettingsClient({
  profile,
  email,
  currentUserId,
  users,
  aiSettings,
  initialTab,
}: SettingsClientProps) {
  const validInitial =
    initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : 'profile'
  const [activeTab, setActiveTab] = useState<string>(validInitial)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground mt-1">
          Perfil, equipe, IA e integração com Google Forms.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-white border border-border/60 p-1 shadow-sm max-w-full lg:max-w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-[#0B0B0B] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-[#F5F5F5]'
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileTab profile={profile} email={email} />}
      {activeTab === 'users' && <UsersTab users={users} currentUserId={currentUserId} />}
      {activeTab === 'ai' && <AITab settings={aiSettings} />}
      {activeTab === 'integracao' && (
        <div className="rounded-2xl border border-border/60 bg-white p-6 sm:p-8 shadow-sm">
          <GoogleFormsHelp variant="embedded" />
        </div>
      )}
    </div>
  )
}
