'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Trash2, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string
  subscription_status: string
  created_at: string
  role: string
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export function UserTable({ users, onUsersChange }: { users: User[]; onUsersChange: (users: User[]) => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUpgradeToBeta = async (userId: string) => {
    setUpgrading(userId)
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'beta',
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (!error) {
        const updatedUsers = users.map(u =>
          u.id === userId ? { ...u, subscription_tier: 'beta', subscription_status: 'active' } : u
        )
        onUsersChange(updatedUsers)
      } else {
        console.error('Upgrade error:', error)
        toast.error('Kunne ikke oppgradere bruker: ' + error.message)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('En feil oppstod')
    } finally {
      setUpgrading(null)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Sikker på å slette ${email}? Dette kan ikke angres!`)) return

    setDeleting(userId)
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (!error) {
        const updatedUsers = users.filter(u => u.id !== userId)
        onUsersChange(updatedUsers)
      } else {
        console.error('Delete error:', error)
        toast.error('Kunne ikke slette bruker: ' + error.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('En feil oppstod')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="p-6 border-b border-slate-800">
        <input
          type="text"
          placeholder="Søk brukere..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">
                Bruker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">
                Registrert
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase">
                Handlinger
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">{user.full_name || 'Ukjent'}</p>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.subscription_tier === 'beta' ? 'bg-emerald-500/20 text-emerald-300' :
                    user.subscription_tier === 'pro' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    {user.subscription_tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.subscription_status === 'active' ? 'bg-green-500/20 text-green-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    {user.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('no-NO') : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {user.subscription_tier !== 'beta' && (
                      <button
                        onClick={() => handleUpgradeToBeta(user.id)}
                        disabled={upgrading === user.id}
                        className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Oppgrader til Beta"
                      >
                        <Crown className={`w-4 h-4 ${upgrading === user.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      disabled={deleting === user.id}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Slett bruker"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
