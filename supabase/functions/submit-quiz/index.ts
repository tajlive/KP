/**
 * Submit Quiz Edge Function
 * Processes quiz answers and returns score
 * Used by: /quiz/futures page
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { quizSlug, answers } = body;

    if (!quizSlug || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quizSlug, answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit quiz attempt using RPC
    const { data: result, error } = await supabase.rpc('submit_quiz_attempt', {
      p_user_id: user.id,
      p_quiz_slug: quizSlug,
      p_answers: answers
    });

    if (error) {
      console.error('Quiz submission error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track event
    await supabase.rpc('record_app_event', {
      p_user_id: user.id,
      p_event_name: result.passed ? 'quiz_passed' : 'quiz_failed',
      p_props: {
        quiz_slug: quizSlug,
        score: result.score,
        pass_score: result.pass_score,
        points_earned: result.points_earned
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        attemptId: result.attempt_id,
        score: result.score,
        passed: result.passed,
        passScore: result.pass_score,
        pointsEarned: result.points_earned,
        correctCount: result.correct_count,
        message: result.passed 
          ? `Congratulations! You passed with ${result.score}%` 
          : `You scored ${result.score}%. You need ${result.pass_score}% to pass.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
