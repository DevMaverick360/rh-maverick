'use client'

import { useState, type FormEvent } from 'react'
import { updateUserRole, deleteUser } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Shield, Users, UserPlus, Mail, Lock, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface UserItem {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

export function UsersTab({ users: initialUsers, currentUserId }: { users: UserItem[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/20 font-semibold text-xs">Admin</Badge>
      case 'rh':
        return <Badge className="bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20 font-semibold text-xs">RH</Badge>
      case 'visualizador':
        return <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 font-semibold text-xs">Visualizador</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-semibold text-xs">{role}</Badge>
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateUserRole(userId, newRole)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleDelete = async (userId: string) => {
    await deleteUser(userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const submitCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/dashboard/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: formData.get('email'),
          full_name: formData.get('full_name'),
          role: formData.get('role'),
          password: formData.get('password'),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean }
      if (!res.ok || json.error) {
        setCreateError(json.error || res.statusText || 'Falha ao criar utilizador.')
        setCreateLoading(false)
        return
      }
      setIsCreateOpen(false)
      setCreateLoading(false)
      form.reset()
      window.location.reload()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Falha ao criar utilizador.')
      setCreateLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0B0B]">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Usuários do Sistema</h3>
            <p className="text-sm text-muted-foreground">Gerencie permissões e convide sua equipe.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="rounded-lg font-semibold h-10 px-5">
                <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo acesso para sua equipe. O usuário poderá logar com estas credenciais.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="full_name" name="full_name" placeholder="Ex: Ana Souza" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="ana@empresa.com" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" className="pl-9" required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel / Perfil</Label>
                <select
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="rh">RH</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </div>

              {createError && (
                <p className="text-sm font-medium text-destructive">{createError}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={createLoading} className="w-full">
                  {createLoading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-border/30">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId
            return (
              <div key={user.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B0B0B] text-white text-xs font-bold shrink-0 shadow-sm border border-white/10">
                    {user.full_name
                      ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {user.full_name || 'Sem nome'}
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none font-normal">você</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No sistema desde {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {roleBadge(user.role)}
                  {!isCurrentUser && (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring/20 transition-all hover:border-gray-400"
                    >
                      <option value="admin">Admin</option>
                      <option value="rh">RH</option>
                      <option value="visualizador">Visualizador</option>
                    </select>
                  )}
                  {!isCurrentUser && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O acesso de <strong>"{user.full_name || 'Sem nome'}"</strong> será revogado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id)}
                            className="bg-destructive hover:bg-destructive/90 text-white border-0"
                          >
                            Sim, Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            )
          })}
          {users.length === 0 && (
            <div className="py-12 text-center bg-gray-50/50">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[#0066FF]/5 border border-[#0066FF]/20 px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0066FF]/10 shrink-0 mt-0.5">
            <Shield className="h-5 w-5 text-[#0066FF]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0066FF]">Gerenciamento de Acesso</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
              Como administrador, você pode criar novas contas para sua equipe de RH e definir o nível de acesso. 
              As alterações de papel são aplicadas instantaneamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
