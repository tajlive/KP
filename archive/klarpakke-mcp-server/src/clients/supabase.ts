/**
 * Enhanced Supabase Integration - Auth, Database, Realtime, and Storage
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY')!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
}

// ==================== CLIENT ====================

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      realtime: {
        timeout: 20000,
      },
    });
  }
  return supabaseClient;
}

// ==================== AUTH ====================

export async function createUser(email: string, password: string, metadata?: Record<string, any>): Promise<any> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata || {},
  });
  
  if (error) throw error;
  return data.user;
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function getUserById(userId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return user;
}

export async function listUsers(page: number = 1, perPage: number = 50): Promise<any[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  });
  
  if (error) throw error;
  return data.users;
}

export async function updateUserAuth(userId: string, updates: { email?: string; password?: string; metadata?: any }): Promise<any> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);
  if (error) throw error;
  return data.user;
}

export async function generateMagicLink(email: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: 'https://www.klarpakke.no/no/innlogging',
    },
  });
  
  if (error) throw error;
  return data.properties?.action_link || '';
}

export async function inviteUserByEmail(email: string, options?: { data?: any; redirectTo?: string }): Promise<any> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, options);
  if (error) throw error;
  return data.user;
}

// ==================== DATABASE ====================

// Safe SQL execution with validation
const ALLOWED_TABLES = [
  'profiles', 'beta_signups', 'klt_transactions', 'klt_balances',
  'subscriptions', 'trades', 'courses', 'email_campaigns',
  'mcp_audit_logs', 'signup_funnel', 'audit_logs',
];

const FORBIDDEN_KEYWORDS = [
  'DROP', 'DELETE FROM', 'TRUNCATE', 'ALTER TABLE', 
  'CREATE TABLE', 'GRANT', 'REVOKE', 'EXECUTE', 'COPY'
];

export function validateQuery(query: string, readOnly: boolean): { valid: boolean; error?: string } {
  const upperQuery = query.toUpperCase();
  
  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      return { valid: false, error: `Forbidden SQL keyword detected: ${keyword}` };
    }
  }
  
  // Check if table is allowed
  const tableMatch = query.match(/FROM\s+(\w+)|JOIN\s+(\w+)/i);
  if (tableMatch) {
    const table = tableMatch[1] || tableMatch[2];
    if (table && !ALLOWED_TABLES.includes(table.toLowerCase())) {
      return { valid: false, error: `Table '${table}' is not in allowed list` };
    }
  }
  
  // Additional safety for read-only mode
  if (readOnly) {
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE'];
    for (const keyword of writeKeywords) {
      if (upperQuery.includes(keyword)) {
        return { valid: false, error: `Write operations not allowed in read-only mode: ${keyword}` };
      }
    }
  }
  
  return { valid: true };
}

export async function executeQuery<T = any>(
  query: string, 
  params?: any[], 
  _options?: { readOnly?: boolean; logToAudit?: boolean }
): Promise<{ data?: T; error?: string; rowCount?: number }> {
  const supabase = getSupabase();
  
  try {
    // Use RPC for safe query execution
    const { data, error, count } = await supabase
      .rpc('exec_sql', { 
        query_text: query,
        query_params: params || []
      });
    
    if (error) {
      return { error: error.message };
    }
    
    return { data: data as T, rowCount: count || 0 };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { error };
  }
}

// ==================== REALTIME ====================

export interface RealtimeChannel {
  channel: any;
  unsubscribe: () => void;
}

export function subscribeToTable(table: string, callback: (payload: any) => void): RealtimeChannel {
  const supabase = getSupabase();
  
  const channel = supabase
    .channel(`table-${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
  
  return {
    channel,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

export function subscribeToUser(userId: string, callback: (payload: any) => void): RealtimeChannel {
  const supabase = getSupabase();
  
  const channel = supabase
    .channel(`user-${userId}-changes`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'profiles',
      filter: `id=eq.${userId}`
    }, callback)
    .subscribe();
  
  return {
    channel,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

// ==================== STORAGE ====================

export async function uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function listFiles(bucket: string, prefix?: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw error;
  return data || [];
}

// ==================== BACKUP ====================

export async function createBackup(): Promise<{ url: string; expiresAt: string }> {
  // Trigger database backup via Supabase management API
  // Note: This requires the Management API token, not the service key
  const managementToken = Deno.env.get('SUPABASE_MANAGEMENT_TOKEN');
  
  if (!managementToken) {
    throw new Error('SUPABASE_MANAGEMENT_TOKEN required for backups');
  }
  
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/backups`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Backup failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function listBackups(): Promise<any[]> {
  const managementToken = Deno.env.get('SUPABASE_MANAGEMENT_TOKEN');
  
  if (!managementToken) {
    throw new Error('SUPABASE_MANAGEMENT_TOKEN required');
  }
  
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/backups`,
    {
      headers: { 'Authorization': `Bearer ${managementToken}` },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to list backups: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.backups || [];
}

// ==================== ANALYTICS ====================

export async function getUserCounts(_timeRange: string): Promise<{
  total: number;
  today: number;
  week: number;
  month: number;
}> {
  const supabase = getSupabase();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  
  const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([
    supabase.from('beta_signups').select('*', { count: 'exact', head: true }),
    supabase.from('beta_signups').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('beta_signups').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    supabase.from('beta_signups').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString()),
  ]);
  
  return {
    total: totalRes.count || 0,
    today: todayRes.count || 0,
    week: weekRes.count || 0,
    month: monthRes.count || 0,
  };
}

// ==================== AUDIT LOGGING ====================

export async function logAudit(log: {
  tool_name: string;
  user_id?: string;
  input: Record<string, any>;
  output: Record<string, any>;
  duration_ms: number;
  success: boolean;
  error?: string;
}): Promise<void> {
  const supabase = getSupabase();
  
  try {
    await supabase.from('mcp_audit_logs').insert([{
      ...log,
      timestamp: new Date().toISOString(),
    }]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ==================== RATE LIMITING ====================

export async function checkRateLimit(toolName: string, windowMs: number = 60000): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const supabase = getSupabase();
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  
  const { count } = await supabase
    .from('mcp_audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tool_name', toolName)
    .gte('timestamp', windowStart);
  
  const limit = 100; // 100 calls per minute
  const used = count || 0;
  
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    resetTime: Date.now() + windowMs,
  };
}

// ==================== EDGE FUNCTIONS ====================

export async function invokeEdgeFunction(functionName: string, payload?: any): Promise<any> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });
  
  if (error) throw error;
  return data;
}
