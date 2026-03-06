

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/utils/error';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuxbjlykgmzskxbclquf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!key) {
    return null;
  }
  
  return createClient(url, key);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.info('No Supabase connection, returning fallback users');
    return NextResponse.json({
      users: [
        { id: '1', name: 'Ola Nordmann', email: 'ola@example.com', source: 'linkedin', time_ago: 'nå nettopp' },
        { id: '2', name: 'Kari Hansen', email: 'kari@example.com', source: 'facebook', time_ago: '5 min siden' },
        { id: '3', name: 'Per Jensen', email: 'per@example.com', source: 'email', time_ago: '12 min siden' },
      ],
      is_fallback: true,
    });
  }

  try {
    const { data: recentUsers, error } = await supabase
      .from('user_profiles' as any)
      .select('id, email, first_name, last_name, created_at, source')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // If no users found, return fallback
    if (!recentUsers || recentUsers.length === 0) {
      return NextResponse.json({
        users: [
          { id: '1', name: 'Ingen registreringer ennå', email: 'venter på første bruker...', source: 'direct', time_ago: '-' },
        ],
        is_fallback: true,
      });
    }

    const formatted = recentUsers.map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonym',
      email: user.email,
      source: user.source || 'direct',
      time_ago: getTimeAgo(new Date(user.created_at)),
    }));

    return NextResponse.json({ users: formatted, is_fallback: false });

  } catch (error) {
    console.error('Recent users error:', getErrorMessage(error));
    return NextResponse.json({
      users: [
        { id: '1', name: 'Ola Nordmann', email: 'ola@example.com', source: 'linkedin', time_ago: 'nå nettopp' },
        { id: '2', name: 'Kari Hansen', email: 'kari@example.com', source: 'facebook', time_ago: '5 min siden' },
      ],
      is_fallback: true,
      error: 'Database connection failed',
    });
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'nå nettopp';
  if (minutes < 60) return `${minutes} min siden`;
  if (hours < 24) return `${hours} t siden`;
  if (days < 7) return `${days} dager siden`;
  return date.toLocaleDateString('no-NO');
}
