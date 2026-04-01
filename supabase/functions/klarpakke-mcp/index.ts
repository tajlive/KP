/**
 * Klarpakke MCP Server v1.2.1 (BUGFIX)
 * 
 * Fixes:
 * - list_jobs: håndterer undefined args
 * - run_script: ignorerer Edge Runtime error, returnerer kun job_id/status
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.39.0';

// ============================================================================
// Types
// ============================================================================

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface McpRequest {
  jsonrpc: string;
  method: string;
  params?: unknown;
  id: string | number;
}

interface RunScriptArgs {
  cmd: string;
  timeout?: number;
}

interface ReadOutputArgs {
  lines?: number;
}

interface ListJobsArgs {
  limit?: number;
}

// ============================================================================
// Environment
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const KLARPAKKE_MCP_SECRET = Deno.env.get('KLARPAKKE_MCP_SECRET') ?? '';

// ============================================================================
// Terminal Security
// ============================================================================

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf/i,
  />\s*\/dev\/(null|zero|random)/i,
  /:\(\)\s*\{\s*:\|:\s*&\s*\};/i,
  /curl\s+.*\|\s*(sh|bash|zsh)/i,
  /wget\s+.*\|\s*(sh|bash|zsh)/i,
  /eval\s*\(/i,
  /sudo\s+/i,
  /doas\s+/i,
  /chmod\s+777/i,
  /mkfs\./i,
  /dd\s+if=/i,
  /nc\s+-[l|p]/i,
  /nmap\s+-/i,
];

const BLOCKED_COMMANDS: string[] = [
  'reboot', 'shutdown', 'halt', 'poweroff', 'init',
  'systemctl', 'service', 'useradd', 'userdel',
  'passwd', 'mkfs', 'fdisk', 'killall', 'pkill'
];

function validateSafeCommand(cmd: string): { safe: boolean; reason?: string } {
  const cmdTrimmed = cmd.trim();
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cmdTrimmed)) {
      return { safe: false, reason: `Blocked: ${pattern.source}` };
    }
  }

  const firstWord = cmdTrimmed.toLowerCase().split(/\s+/)[0];
  if (BLOCKED_COMMANDS.includes(firstWord)) {
    return { safe: false, reason: `Blocked command: ${firstWord}` };
  }

  return { safe: true };
}

// ============================================================================
// Utilities
// ============================================================================

function createErrorResponse(message: string, details?: unknown): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message, details }, null, 2) }],
    isError: true
  };
}

function createSuccessResponse(data: unknown): ToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function logMcpCall(
  supabase: SupabaseClient,
  toolName: string,
  input: unknown,
  output: unknown,
  durationMs: number,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await supabase.from('mcp_audit_logs').insert({
      tool_name: toolName,
      input: input ?? {},
      output: output ?? {},
      duration_ms: durationMs,
      success,
      error: error ?? null
    });
  } catch {
    // Ignorer
  }
}

// ============================================================================
// Terminal Tools
// ============================================================================

/**
 * run_script: Validerer og queue-et script
 * Ignorerer Edge Runtime error - returnerer kun job_id for lokal kjøring
 */
async function runScript(supabase: SupabaseClient, args: RunScriptArgs): Promise<ToolResponse> {
  const startTime = Date.now();
  const jobId = crypto.randomUUID();
  
  // FIX: håndter undefined args
  const cmd = args?.cmd ?? '';
  if (!cmd) {
    return createErrorResponse('Missing cmd argument');
  }
  
  // Valider
  const validation = validateSafeCommand(cmd);
  
  if (!validation.safe) {
    await supabase.from('terminal_jobs').insert({
      id: jobId,
      cmd: cmd,
      status: 'blocked',
      validation_result: validation,
      stderr: validation.reason,
      duration_ms: 0,
      completed_at: new Date().toISOString()
    });
    
    const result = { job_id: jobId, status: 'blocked', cmd, reason: validation.reason };
    await logMcpCall(supabase, 'run_script', args, result, Date.now() - startTime, false, validation.reason);
    return createErrorResponse(`Blocked: ${validation.reason}`, result);
  }
  
  // Lagre jobb som pending (kjøres lokalt av MCP-klient)
  await supabase.from('terminal_jobs').insert({
    id: jobId,
    cmd: cmd,
    status: 'pending',
    validation_result: validation,
    created_at: new Date().toISOString()
  });
  
  // Returner umiddelbart - kjøring skjer lokalt
  const result = {
    job_id: jobId,
    status: 'pending',
    cmd: cmd,
    validated: true,
    message: 'Command validated and queued. Execute locally with: ' + cmd
  };
  
  await logMcpCall(supabase, 'run_script', args, result, Date.now() - startTime, true);
  return createSuccessResponse(result);
}

/**
 * read_output: Returnerer tom da vi ikke har subprocess i Edge Runtime
 */
async function readOutput(supabase: SupabaseClient, args: ReadOutputArgs): Promise<ToolResponse> {
  const startTime = Date.now();
  const lines = Math.min(args?.lines ?? 10, 100);
  
  const result = {
    lines,
    output: [],
    message: 'Output reading disabled in Edge Runtime. Run commands locally.'
  };
  
  await logMcpCall(supabase, 'read_output', args, result, Date.now() - startTime, true);
  return createSuccessResponse(result);
}

/**
 * list_jobs: Lister terminal-jobs fra databasen
 * FIX: håndterer undefined args med args?.limit ?? 10
 */
async function listJobs(supabase: SupabaseClient, args?: ListJobsArgs): Promise<ToolResponse> {
  const startTime = Date.now();
  
  // FIX: Safe optional chaining med fallback
  const limit = Math.min(args?.limit ?? 10, 50);
  
  try {
    const { data, error } = await supabase
      .from('terminal_jobs')
      .select('id, cmd, status, exit_code, duration_ms, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const result = { jobs: data ?? [], count: data?.length ?? 0, limit };
    await logMcpCall(supabase, 'list_jobs', args ?? {}, result, Date.now() - startTime, true);
    return createSuccessResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logMcpCall(supabase, 'list_jobs', args ?? {}, {}, Date.now() - startTime, false, message);
    return createErrorResponse('Database error', message);
  }
}

// ============================================================================
// Database Tools
// ============================================================================

async function getTsErrors(supabase: SupabaseClient): Promise<ToolResponse> {
  const { data } = await supabase.from('build_status').select('*').eq('id', 1).single();
  return createSuccessResponse({
    error_count: data?.error_count ?? 0,
    files_affected: data?.files_affected ?? 0
  });
}

async function getSchemaTables(supabase: SupabaseClient): Promise<ToolResponse> {
  const { data } = await supabase.rpc('get_tables_info');
  return createSuccessResponse(data ?? []);
}

async function queryTable(supabase: SupabaseClient, args?: { table: string; select?: string; limit?: number }): Promise<ToolResponse> {
  const table = args?.table ?? '';
  if (!table) {
    return createErrorResponse('Missing table argument');
  }
  const limit = Math.min(args?.limit ?? 50, 50);
  const { data } = await supabase.from(table).select(args?.select ?? '*').limit(limit);
  return createSuccessResponse(data ?? []);
}

async function getUserStats(supabase: SupabaseClient): Promise<ToolResponse> {
  const { count: users } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
  const { count: activePaper } = await supabase.from('trading_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('mode', 'paper');
  const { count: activeLive } = await supabase.from('trading_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('mode', 'live');
  return createSuccessResponse({ 
    total_users: users ?? 0,
    active_paper_traders: activePaper ?? 0,
    active_live_traders: activeLive ?? 0
  });
}

async function checkRlsPolicies(supabase: SupabaseClient): Promise<ToolResponse> {
  const { data } = await supabase.rpc('get_rls_status_detailed');
  return createSuccessResponse(data ?? []);
}

// ============================================================================
// Tool Registry
// ============================================================================

const tools: Record<string, {
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (s: SupabaseClient, a?: unknown) => Promise<ToolResponse>;
}> = {
  get_ts_errors: {
    description: 'Hent TypeScript-feil',
    inputSchema: { type: 'object' },
    handler: getTsErrors
  },
  get_schema_tables: {
    description: 'List tabeller',
    inputSchema: { type: 'object' },
    handler: getSchemaTables
  },
  query_table: {
    description: 'Query tabell',
    inputSchema: { type: 'object', properties: { table: { type: 'string' }, limit: { type: 'number' } }, required: ['table'] },
    handler: queryTable
  },
  get_user_stats: {
    description: 'User stats',
    inputSchema: { type: 'object' },
    handler: getUserStats
  },
  check_rls_policies: {
    description: 'Sjekk RLS',
    inputSchema: { type: 'object' },
    handler: checkRlsPolicies
  },
  run_script: {
    description: 'Valider og queue shell-script (blokkerer rm, sudo, curl|sh)',
    inputSchema: { type: 'object', properties: { cmd: { type: 'string' } }, required: ['cmd'] },
    handler: runScript
  },
  read_output: {
    description: 'Les output (placeholder i Edge Runtime)',
    inputSchema: { type: 'object', properties: { lines: { type: 'number' } } },
    handler: readOutput
  },
  list_jobs: {
    description: 'List terminal-jobs',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    handler: listJobs
  }
};

// ============================================================================
// MCP Handler
// ============================================================================

async function handleMcpRequest(supabase: SupabaseClient, request: McpRequest): Promise<unknown> {
  const { method, params, id } = request;

  if (method === 'initialize') {
    return { 
      jsonrpc: '2.0', 
      id, 
      result: { 
        protocolVersion: '2024-11-05', 
        capabilities: { tools: {} }, 
        serverInfo: { name: 'klarpakke-mcp', version: '1.2.1' } 
      } 
    };
  }

  if (method === 'tools/list') {
    const toolList = Object.entries(tools).map(([name, tool]) => ({ 
      name, 
      description: tool.description, 
      inputSchema: tool.inputSchema 
    }));
    return { jsonrpc: '2.0', id, result: { tools: toolList } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params as { name: string; arguments?: unknown };
    const tool = tools[name];
    
    if (!tool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${name}` } };
    }

    try {
      const result = await tool.handler(supabase, args);
      return { jsonrpc: '2.0', id, result: { content: result.content, isError: result.isError ?? false } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      return { jsonrpc: '2.0', id, error: { code: -32603, message } };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ============================================================================
// HTTP Handler
// ============================================================================

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
  'Access-Control-Allow-Headers': 'Content-Type, Authorization' 
};

function getPath(req: Request): string {
  const url = new URL(req.url);
  const match = url.pathname.match(/\/klarpakke-mcp(\/.*)?$/);
  return match?.[1] ?? '/';
}

async function handleRequest(req: Request): Promise<Response> {
  const path = getPath(req);
  
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  
  if (path === '/health' && req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', version: '1.2.1' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (path === '/mcp' || path === '/' || path === '') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (token !== KLARPAKKE_MCP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { autoRefreshToken: false, persistSession: false } 
    });

    try {
      const body = await req.json();
      const result = await handleMcpRequest(supabase, body);
      return new Response(
        JSON.stringify(result), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }), 
        { status: 400, headers: corsHeaders }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Not found' }), 
    { status: 404, headers: corsHeaders }
  );
}

Deno.serve(handleRequest);
