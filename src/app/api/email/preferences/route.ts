/**
 * GET /api/email/preferences
 * POST /api/email/preferences
 * 
 * Manage user email notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch current user's preferences
export async function GET() {
  try {
    const supabase: unknown = (await createClient()) as unknown;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Use the database function to get or create preferences
    const { data: prefs, error } = await supabase.rpc(
      'get_or_create_email_preferences',
      { p_user_id: user.id }
    );
    
    if (error) {
      console.error('[API /email/preferences] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(prefs);
    
  } catch (error) {
    console.error('[API /email/preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update current user's preferences
export async function POST(req: NextRequest) {
  try {
    const supabase: unknown = (await createClient()) as unknown;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Validate allowed fields
    const allowedFields = [
      'marketing_emails',
      'gamification_emails',
      'trading_alerts',
      'digest_emails',
    ];
    
    const updates: Record<string, boolean | string> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Ensure preferences exist first
    await supabase.rpc('get_or_create_email_preferences', { p_user_id: user.id });
    
    // Update preferences
    const { data: prefs, error } = await supabase
      .from('email_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single() as unknown;
    
    if (error) {
      console.error('[API /email/preferences] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      preferences: prefs,
    });
    
  } catch (error) {
    console.error('[API /email/preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
