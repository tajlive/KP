/**
 * POST /api/email/send
 * 
 * Send an email to a user (internal/admin use)
 * Requires admin or service role authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTemplatedEmail, queueEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin or service role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = profile?.role as string | null;
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { userId, type, data, queue = false } = body;
    
    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type' },
        { status: 400 }
      );
    }
    
    // Send or queue email
    let result;
    if (queue) {
      result = await queueEmail({ userId, type, data });
    } else {
      result = await sendTemplatedEmail({ userId, type, data });
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: queue ? 'Email queued' : 'Email sent',
    });
    
  } catch (error) {
    console.error('[API /email/send] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
