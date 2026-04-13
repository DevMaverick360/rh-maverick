import { redirect } from 'next/navigation'

/** Link antigo da sidebar: envia para Configurações → Integração */
export default function HelpRedirectPage() {
  redirect('/dashboard/settings?tab=integracao')
}
