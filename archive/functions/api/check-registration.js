// Cloudflare Pages Function - Check if user is registered
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const email = body.email?.toLowerCase().trim();
    
    if (!email) {
      return new Response(
        JSON.stringify({ found: false, error: 'Email required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Query Supabase
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/beta_signups?email=eq.${encodeURIComponent(email)}&select=email,student_nummer`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const data = await response.json();
    
    if (data && data.length > 0) {
      return new Response(
        JSON.stringify({ 
          found: true, 
          email: data[0].email,
          student_nummer: data[0].student_nummer,
          erfaring: data[0].erfaring,
          laeringsmaal: data[0].laeringsmaal,
          created_at: data[0].created_at,
          onboarding_step: data[0].onboarding_step || 'registered'
        }),
        { headers: corsHeaders }
      );
    } else {
      return new Response(
        JSON.stringify({ found: false }),
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ found: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Also handle GET for simple checks
export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({ message: 'Use POST with email to check registration' }),
    { 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}
