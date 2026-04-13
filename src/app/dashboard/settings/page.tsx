import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/settings-client'
import { listUsers, getAISettings } from '@/app/actions/settings'

type TabParam = 'profile' | 'users' | 'ai' | 'integracao'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const allowed: TabParam[] = ['profile', 'users', 'ai', 'integracao']
  const initialTab = tab && allowed.includes(tab as TabParam) ? (tab as TabParam) : undefined

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id || '')
    .single()

  // Get all users
  const { data: users } = await listUsers()

  // Get AI settings
  const { data: aiSettings } = await getAISettings()

  return (
    <SettingsClient
      profile={profile}
      email={user?.email || ''}
      currentUserId={user?.id || ''}
      users={users || []}
      aiSettings={aiSettings}
      initialTab={initialTab}
    />
  )
}
