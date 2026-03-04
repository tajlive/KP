

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MISTAKE ANALYZER API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Returns trading mistake analysis and learning recommendations
 * 
 * Endpoint: GET /api/auto-trading/mistakes?sessionId=[id]
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { NextRequest, NextResponse } from 'next/server';
import { MistakeAnalyzer } from '@/lib/auto-trading/mistake-analyzer';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter: sessionId',
          code: 'MISSING_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from('auto_trading_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { 
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Session not found or unauthorized',
          code: 'UNAUTHORIZED'
        },
        { status: 404 }
      );
    }

    // Run analysis
    const analyzer = new MistakeAnalyzer();
    const result = await analyzer.analyze(user.id, sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      mistakes: result.mistakes,
      learningPlan: result.learningPlan,
      tradingScore: result.tradingScore,
      summary: result.summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in mistakes endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
