import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Cliente com service role: storage e inserts sem sessão do candidato (webhooks, Forms). */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
