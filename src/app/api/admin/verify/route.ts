

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuxbjlykgmzskxbclquf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!key) return null;
  return createClient(url, key);
}

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Database connection failed' 
    }, { status: 503 });
  }

  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'No authorization header' 
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Invalid token' 
      }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles' as unknown)
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';

    return NextResponse.json({
      isAdmin,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
    });

  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
