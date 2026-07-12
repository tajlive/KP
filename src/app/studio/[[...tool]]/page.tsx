import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs';

// Dynamic import — sanity/studio (53MB node_modules) lastes kun når ruta besøkes
const Studio = dynamic(() => import('./Studio'), {
  loading: () => (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
    </div>
  ),
});

export default async function StudioPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/no/login')
  }

  return <Studio />
}
