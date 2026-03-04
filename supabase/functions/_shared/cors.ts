/**
 * Shared CORS utilities for Supabase Edge Functions
 * Centralizes CORS handling across all functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type, x-cron-secret, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 * @param req - The incoming request
 * @returns Response if OPTIONS request, null otherwise
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a JSON response with CORS headers
 * @param data - The data to return
 * @param status - HTTP status code
 * @returns Response with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with CORS headers
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Error response with CORS headers
 */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}
