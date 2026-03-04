/**
 * Enhanced Vercel Integration - Deployments, Domains, Logs, and Analytics
 */

const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN')!;
const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');
const PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID') || 'prj_klarpakke';

if (!VERCEL_TOKEN) {
  console.warn('VERCEL_TOKEN not set - Vercel tools will be disabled');
}

const VERCEL_API = 'https://api.vercel.com';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function vercelFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!VERCEL_TOKEN) {
    throw new Error('Vercel not configured');
  }

  let url = `${VERCEL_API}${path}`;
  
  // Add team parameter if set
  if (VERCEL_TEAM_ID) {
    url += (url.includes('?') ? '&' : '?') + `teamId=${VERCEL_TEAM_ID}`;
  }
  
  // Add query params
  if (options.params) {
    const params = new URLSearchParams(options.params);
    url += (url.includes('?') ? '&' : '?') + params.toString();
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ==================== DEPLOYMENTS ====================

export interface VercelDeployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'READY' | 'CANCELED' | 'QUEUED';
  createdAt: number;
  ready?: number;
  branch?: string;
  commit?: {
    sha: string;
    message: string;
    author: string;
  };
  creator?: {
    username: string;
  };
  target?: 'production' | 'staging';
  meta?: Record<string, string>;
}

export async function getDeployments(limit: number = 20, target?: string): Promise<VercelDeployment[]> {
  const params: Record<string, string> = { 
    projectId: PROJECT_ID,
    limit: limit.toString(),
  };
  if (target) params.target = target;
  
  const result = await vercelFetch<{ deployments: VercelDeployment[] }>('/v6/deployments', { params });
  return result.deployments;
}

export async function getDeployment(id: string): Promise<VercelDeployment> {
  return vercelFetch<VercelDeployment>(`/v13/deployments/${id}`);
}

export async function deployToProduction(branch: string): Promise<VercelDeployment> {
  // Trigger deployment by creating a new deployment
  const result = await vercelFetch<{ deployments: VercelDeployment[] }>(
    '/v13/deployments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: PROJECT_ID,
        gitSource: {
          type: 'github',
          ref: branch,
        },
        target: 'production',
      }),
    }
  );
  
  return result.deployments[0];
}

export async function cancelDeployment(id: string): Promise<void> {
  await vercelFetch(`/v12/deployments/${id}/cancel`, { method: 'PATCH' });
}

export async function deleteDeployment(id: string): Promise<void> {
  await vercelFetch(`/v12/deployments/${id}`, { method: 'DELETE' });
}

// ==================== ROLLOUT ====================

export async function promoteDeployment(id: string): Promise<void> {
  await vercelFetch(`/v13/deployments/${id}/promote`, {
    method: 'POST',
    body: JSON.stringify({
      target: 'production',
    }),
  });
}

// ==================== DOMAINS ====================

export interface VercelDomain {
  name: string;
  apexName: string;
  verified: boolean;
  verification: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

export async function listDomains(): Promise<VercelDomain[]> {
  const result = await vercelFetch<{ domains: VercelDomain[] }>(`/v5/domains`);
  return result.domains;
}

export async function addDomain(domain: string): Promise<VercelDomain> {
  return vercelFetch('/v4/domains', {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
}

export async function removeDomain(domain: string): Promise<void> {
  await vercelFetch(`/v4/domains/${domain}`, { method: 'DELETE' });
}

export async function verifyDomain(domain: string): Promise<VercelDomain> {
  return vercelFetch(`/v4/domains/${domain}/verify`, { method: 'POST' });
}

// ==================== LOGS ====================

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: 'build' | 'static' | 'external' | 'lambda';
}

export async function getDeploymentLogs(deploymentId: string): Promise<LogEntry[]> {
  const result = await vercelFetch<{ events: LogEntry[] }>(
    `/v2/deployments/${deploymentId}/events`
  );
  return result.events;
}

export async function streamLogs(deploymentId: string, callback: (log: LogEntry) => void): Promise<void> {
  // Note: Real streaming would require WebSocket or SSE
  // This is a polling version
  const logs = await getDeploymentLogs(deploymentId);
  logs.forEach(callback);
}

// ==================== PROJECT SETTINGS ====================

export interface Project {
  id: string;
  name: string;
  framework?: string;
  latestDeployments?: VercelDeployment[];
  targets?: {
    production?: {
      alias: string[];
    };
  };
}

export async function getProject(): Promise<Project> {
  return vercelFetch(`/v9/projects/${PROJECT_ID}`);
}

export async function updateProject(updates: Partial<Project>): Promise<Project> {
  return vercelFetch(`/v9/projects/${PROJECT_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ==================== ENVIRONMENT VARIABLES ====================

export interface EnvVar {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type: 'plain' | 'encrypted' | 'secret';
}

export async function getEnvironmentVariables(): Promise<EnvVar[]> {
  const result = await vercelFetch<{ envs: EnvVar[] }>(`/v9/projects/${PROJECT_ID}/env`);
  return result.envs;
}

export async function addEnvironmentVariable(env: Omit<EnvVar, 'type'> & { type?: string }): Promise<EnvVar> {
  return vercelFetch(`/v9/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key: env.key,
      value: env.value,
      target: env.target,
      type: env.type || 'encrypted',
    }),
  });
}

export async function removeEnvironmentVariable(key: string): Promise<void> {
  const envs = await getEnvironmentVariables();
  const env = envs.find(e => e.key === key);
  if (env) {
    // Need to get the env ID from the full list
    const result = await vercelFetch<{ envs: Array<{ id: string; key: string }> }>(
      `/v9/projects/${PROJECT_ID}/env`
    );
    const found = result.envs.find(e => e.key === key);
    if (found) {
      await vercelFetch(`/v9/projects/${PROJECT_ID}/env/${found.id}`, { method: 'DELETE' });
    }
  }
}

// ==================== ANALYTICS ====================

export async function getDeploymentAnalytics(days: number = 7): Promise<{
  total: number;
  successful: number;
  failed: number;
  averageBuildTime: number;
}> {
  const deployments = await getDeployments(100);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const recent = deployments.filter(d => d.createdAt > since);
  
  const successful = recent.filter(d => d.state === 'READY');
  const failed = recent.filter(d => d.state === 'ERROR');
  
  const buildTimes = successful
    .filter(d => d.ready)
    .map(d => (d.ready! - d.createdAt) / 1000);
  
  const avgBuildTime = buildTimes.length > 0
    ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length
    : 0;
  
  return {
    total: recent.length,
    successful: successful.length,
    failed: failed.length,
    averageBuildTime: Math.round(avgBuildTime),
  };
}

// ==================== HEALTH CHECKS ====================

const HEALTH_ENDPOINTS = [
  { path: '/api/health', name: 'API Health' },
  { path: '/no', name: 'Homepage' },
  { path: '/no/innlogging', name: 'Login Page' },
  { path: '/no/opptak', name: 'Signup Page' },
  { path: '/api/admin/campaign/stats', name: 'Admin API' },
];

export interface HealthCheck {
  name: string;
  url: string;
  status: 'pass' | 'fail' | 'warn';
  response_time: number;
  status_code?: number;
  message?: string;
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const project = await getProject();
  const productionUrl = project.targets?.production?.alias[0] || 'www.klarpakke.no';
  const baseUrl = `https://${productionUrl}`;
  
  const results: HealthCheck[] = [];
  
  for (const endpoint of HEALTH_ENDPOINTS) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'HEAD',
        redirect: 'follow',
      });
      const duration = Date.now() - start;
      
      results.push({
        name: endpoint.name,
        url: `${baseUrl}${endpoint.path}`,
        status: response.ok ? 'pass' : 'fail',
        response_time: duration,
        status_code: response.status,
      });
    } catch (err) {
      results.push({
        name: endpoint.name,
        url: `${baseUrl}${endpoint.path}`,
        status: 'fail',
        response_time: Date.now() - start,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  }
  
  return results;
}

export async function getProductionDeployment(): Promise<VercelDeployment | null> {
  const deployments = await getDeployments(1, 'production');
  return deployments.find(d => d.state === 'READY') || deployments[0] || null;
}

// ==================== TEAM & BILLING ====================

export async function getTeamInfo(): Promise<{
  id: string;
  name: string;
  slug: string;
}> {
  if (!VERCEL_TEAM_ID) {
    throw new Error('VERCEL_TEAM_ID not set');
  }
  
  return vercelFetch(`/v2/teams/${VERCEL_TEAM_ID}`);
}

export async function getUsage(start: string, end: string): Promise<{
  bandwidth: number;
  invocations: number;
}> {
  const result = await vercelFetch<{ bandwidth: number; invocations: number }>(
    `/v1/usage`,
    { params: { from: start, to: end } }
  );
  return result;
}

// ==================== BUILD CACHE ====================

export async function clearBuildCache(): Promise<void> {
  await vercelFetch(`/v9/projects/${PROJECT_ID}/cache`, { method: 'DELETE' });
}

// ==================== ALIASES ====================

export async function listAliases(): Promise<Array<{
  alias: string;
  created: number;
  deployment?: VercelDeployment;
}>> {
  const result = await vercelFetch<{ aliases: any[] }>(`/v4/aliases`, {
    params: { projectId: PROJECT_ID },
  });
  return result.aliases;
}

export async function assignAlias(deploymentId: string, alias: string): Promise<void> {
  await vercelFetch('/v2/now/aliases', {
    method: 'POST',
    body: JSON.stringify({
      deploymentId,
      alias,
    }),
  });
}
