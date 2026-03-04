/**
 * Get Quiz Edge Function
 * Returns quiz content with questions for authenticated users
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
    const url = new URL(req.url);
    const quizSlug = url.searchParams.get('slug');

    if (!quizSlug) {
      return new Response(
        JSON.stringify({ error: 'Missing quiz slug' }),
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

    // Get quiz with questions using RPC
    const { data: quiz, error } = await supabase.rpc('get_quiz_with_questions', {
      p_quiz_slug: quizSlug
    });

    if (error || !quiz) {
      return new Response(
        JSON.stringify({ error: 'Quiz not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's previous attempts
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score, passed, created_at')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Track quiz view
    await supabase.rpc('record_app_event', {
      p_user_id: user.id,
      p_event_name: 'quiz_view',
      p_props: { quiz_slug: quizSlug }
    });

    return new Response(
      JSON.stringify({
        quiz: {
          id: quiz.id,
          slug: quiz.slug,
          title: quiz.title,
          description: quiz.description,
          passScore: quiz.pass_score,
          isRequiredForFutures: quiz.is_required_for_futures,
          questionCount: quiz.questions?.length || 0,
          questions: quiz.questions?.map((q: any) => ({
            id: q.id,
            questionNumber: q.question_number,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options.map((opt: any, idx: number) => ({
              index: idx,
              text: opt.text
            })),
            points: q.points
          }))
        },
        previousAttempts: attempts || [],
        bestScore: attempts?.reduce((max, a) => Math.max(max, a.score), 0) || 0,
        hasPassed: attempts?.some((a: any) => a.passed) || false
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
