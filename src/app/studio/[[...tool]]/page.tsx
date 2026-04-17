import { metadata, viewport } from 'next-sanity/studio'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Studio from './Studio'

export { metadata, viewport }

export default async function StudioPage() {
  // Protect Studio — require authenticated user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <Studio />
}
