import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequest {
  message: string;
  conversationId?: string;
  model?: 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k';
  temperature?: number;
}

const SYSTEM_PROMPT = `Du er "Kimi" - AI-assistent for Klarpakke Universitet, en norsk krypto-utdanningsplattform.

Din spesialisering:
- Kryptovaluta grunnleggende (Bitcoin, Ethereum, etc.)
- Blockchain-teknologi
- Trading-strategier og teknisk analyse
- Risikostyring og porteføljeforvaltning
- Norske skatteregler for krypto (generell info)

Viktige regler:
1. Svar ALLTID på norsk
2. Vær pedagogisk og tålmodig
3. Inkluder risikoadvarsler ved trading/investering
4. Aldri gi personlig finansiell rådgivning
5. Henvis til profesjonelle rådgivere ved komplekse spørsmål
6. Vær presis - unngå "fluff"

Eksempel på risikoadvarsel:
"⚠️ Husk: Kryptovaluta er volatilt. Aldri invester mer enn du har råd til å tape."`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get API key from environment
    const apiKey = Deno.env.get("MOONSHOT_API_KEY");
    if (!apiKey) {
      throw new Error("MOONSHOT_API_KEY not configured");
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { message, model = 'moonshot-v1-8k', temperature = 0.7 } = body;

    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Call Moonshot API
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Moonshot API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get response from AI" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Beklager, jeg kunne ikke generere et svar.";

    // Log usage (optional - for analytics)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Get user ID from auth header
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
          
          // Store chat log (optional - create table if you want this)
          // await supabase.from("ai_chat_logs").insert({
          //   user_id: user?.id,
          //   question: message,
          //   response: aiResponse,
          //   model,
          //   tokens_used: data.usage?.total_tokens || 0,
          // });
        }
      }
    } catch (logError) {
      // Non-critical error, just log it
      console.error("Failed to log chat:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        model,
        usage: data.usage,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
