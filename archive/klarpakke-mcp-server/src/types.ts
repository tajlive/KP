/**
 * Klarpakke MCP Server - Type Definitions
 */

// Analytics Types
export interface DashboardMetrics {
  total_users: number;
  signups_today: number;
  signups_week: number;
  signups_month: number;
  active_users: number;
  mrr: number;
  conversion_rate: number;
  timestamp: string;
}

export interface SignupTrend {
  date: string;
  count: number;
}

export interface TopUser {
  id: string;
  email: string;
  name: string;
  trades: number;
  referrals: number;
  klt_balance: number;
  joined_at: string;
}

// User Management Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'student' | 'founder' | 'admin';
  status: 'active' | 'inactive' | 'banned';
  klt_balance: number;
  created_at: string;
  last_active?: string;
  metadata?: Record<string, any>;
}

export interface UserUpdate {
  full_name?: string;
  role?: User['role'];
  status?: User['status'];
  metadata?: Record<string, any>;
}

// Email Campaign Types
export interface EmailCampaign {
  id: string;
  name: string;
  audience: 'all' | 'founders' | 'inactive' | 'custom';
  template: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  created_at: string;
  sent_at?: string;
}

export interface EmailStats {
  total_sent: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

// Deployment Types
export interface Deployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'READY' | 'CANCELED';
  created_at: string;
  branch: string;
  commit: string;
  health_checks?: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  response_time: number;
}

// Database Types
export interface TableStats {
  name: string;
  row_count: number;
  size_bytes: number;
  indexes: IndexInfo[];
  last_vacuum?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  type: string;
}

export interface BackupInfo {
  id: string;
  url: string;
  size_bytes: number;
  created_at: string;
  expires_at: string;
}

// Token Types
export interface KLTTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'award' | 'spend' | 'airdrop' | 'referral';
  reason: string;
  created_at: string;
}

export interface KLTHolder {
  user_id: string;
  email: string;
  balance: number;
  rank: number;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  tool_name: string;
  user_id?: string;
  timestamp: string;
  input: Record<string, any>;
  output: Record<string, any>;
  duration_ms: number;
  success: boolean;
  error?: string;
}

// Tool Input/Output Types
export interface ToolInput {
  [key: string]: any;
}

export interface ToolOutput {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    duration_ms: number;
  };
}

// MCP Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}
