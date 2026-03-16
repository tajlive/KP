/**
 * Modern GitHub Integration for Klarpakke MCP
 * 
 * Features:
 * - GraphQL API support (primary) + REST (fallback)
 * - Intelligent caching with TTL
 * - Rate limit handling with exponential backoff
 * - Comprehensive error handling
 * - Type-safe with full TypeScript support
 * - Pagination support
 * - Webhook verification
 * - Modern ES2023+ features
 * 
 * @version 2.0.0
 * @author Klarpakke MCP Team
 */

// Using native Web Crypto API for hashing

// ============================================
// CONFIGURATION & TYPES
// ============================================

interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  apiVersion: string;
  maxRetries: number;
  baseDelay: number;
  cacheTtl: number;
}

const config: GitHubConfig = {
  pat: Deno.env.get("GITHUB_PAT") || "",
  owner: Deno.env.get("GITHUB_OWNER") || "tajlive",
  repo: Deno.env.get("GITHUB_REPO_NAME") || "klarpakke",
  apiVersion: "2022-11-28",
  maxRetries: 3,
  baseDelay: 1000,
  cacheTtl: 60000, // 1 minute cache
};

// Modern error types
type GitHubErrorType = 
  | "RATE_LIMITED" 
  | "NOT_FOUND" 
  | "UNAUTHORIZED" 
  | "VALIDATION_FAILED" 
  | "SERVER_ERROR"
  | "NETWORK_ERROR";

class GitHubError extends Error {
  constructor(
    public type: GitHubErrorType,
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

// ============================================
// SMART CACHE SYSTEM
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string | undefined;
}

class GitHubCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly ttl: number;

  constructor(ttl: number = 60000) {
    this.ttl = ttl;
  }

  private generateKey(endpoint: string, params?: Record<string, any>): string {
    const data = JSON.stringify({ endpoint, params });
    // Simple hash using DJB2 algorithm for synchronous operation
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }

  get<T>(endpoint: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(endpoint: string, data: T, params?: Record<string, any>, etag?: string): void {
    const key = this.generateKey(endpoint, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag,
    };
    this.cache.set(key, entry);
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit tracking
    };
  }
}

const cache = new GitHubCache(config.cacheTtl);

// ============================================
// RATE LIMITER
// ============================================

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

class RateLimiter {
  private rateLimit: RateLimitInfo | null = null;
  private readonly minRemaining = 10;

  async checkLimit(): Promise<void> {
    if (!this.rateLimit) return;
    
    if (this.rateLimit.remaining < this.minRemaining) {
      const waitTime = this.rateLimit.reset.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`[GitHub] Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await delay(waitTime);
      }
    }
  }

  updateFromHeaders(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const used = headers.get("x-ratelimit-used");

    if (limit && remaining && reset) {
      this.rateLimit = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000),
        used: used ? parseInt(used) : 0,
      };
    }
  }

  getInfo(): RateLimitInfo | null {
    return this.rateLimit;
  }
}

const rateLimiter = new RateLimiter();

// ============================================
// UTILITIES
// ============================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = config.maxRetries,
  baseDelay: number = config.baseDelay
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.log(`[GitHub] Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms`);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError;
}

// ============================================
// GRAPHQL CLIENT (Modern Primary API)
// ============================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    type: string;
    path?: string[];
  }>;
}

async function graphql<T>(
  query: string,
  variables?: Record<string, any>,
  useCache: boolean = true
): Promise<T> {
  const cacheKey = `graphql:${query}`;
  
  if (useCache) {
    const cached = cache.get<T>(cacheKey, variables);
    if (cached) {
      console.log(`[GitHub] GraphQL cache hit for ${query.slice(0, 50)}...`);
      return cached;
    }
  }

  await rateLimiter.checkLimit();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.pat}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": config.apiVersion,
    },
    body: JSON.stringify({ query, variables }),
  });

  rateLimiter.updateFromHeaders(response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new GitHubError(
      response.status === 403 ? "RATE_LIMITED" : "SERVER_ERROR",
      `GraphQL error: ${response.status} - ${errorText}`,
      response.status
    );
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const error = result.errors[0];
    throw new GitHubError(
      "VALIDATION_FAILED",
      error?.message || "GraphQL validation failed",
      undefined,
      result.errors
    );
  }

  if (!result.data) {
    throw new GitHubError("SERVER_ERROR", "No data returned from GraphQL");
  }

  if (useCache) {
    cache.set(cacheKey, result.data, variables);
  }

  return result.data;
}

// ============================================
// REST CLIENT (Fallback)
// ============================================

interface RESTResponse<T> {
  data: T;
  headers: Headers;
  status: number;
}

// Common GitHub API types
interface RepositoryInfo {
  name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  private: boolean;
  license: { name: string } | null;
}

interface DeploymentInfo {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  created_at: string;
  creator: { login: string };
}

interface DeploymentStatusInfo {
  state: string;
  description: string | null;
  target_url: string | null;
}

// deno-lint-ignore no-explicit-any
type AnyRecord = Record<string, any>;

interface DeploymentStatusInfo {
  state: string;
  description: string | null;
  target_url: string | null;
}

async function rest<T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = true
): Promise<RESTResponse<T>> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`;
  
  if (useCache && options.method === "GET" || !options.method) {
    const cached = cache.get<T>(endpoint);
    if (cached) {
      console.log(`[GitHub] REST cache hit for ${endpoint}`);
      return {
        data: cached,
        headers: new Headers(),
        status: 200,
      };
    }
  }

  await rateLimiter.checkLimit();

  const response = await exponentialBackoff(async () => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${config.pat}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": config.apiVersion,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 404) {
      throw new GitHubError("NOT_FOUND", `Resource not found: ${endpoint}`, 404);
    }

    if (res.status === 401) {
      throw new GitHubError("UNAUTHORIZED", "Invalid GitHub token", 401);
    }

    if (res.status === 403) {
      const resetHeader = res.headers.get("x-ratelimit-reset");
      const resetTime = resetHeader ? new Date(parseInt(resetHeader) * 1000) : new Date();
      throw new GitHubError(
        "RATE_LIMITED",
        `Rate limited. Resets at ${resetTime.toISOString()}`,
        403
      );
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new GitHubError(
        "SERVER_ERROR",
        `GitHub API error: ${res.status} - ${errorText}`,
        res.status
      );
    }

    return res;
  });

  rateLimiter.updateFromHeaders(response.headers);

  const data = await response.json();

  if (useCache && (options.method === "GET" || !options.method)) {
    const etag = response.headers.get("etag") || undefined;
    cache.set(endpoint, data, undefined, etag || undefined);
  }

  return {
    data,
    headers: response.headers,
    status: response.status,
  };
}

// ============================================
// MODERN TOOLS
// ============================================

// Repository Info with GraphQL
export async function getRepositoryInfo() {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        name
        description
        url
        defaultBranchRef {
          name
        }
        primaryLanguage {
          name
          color
        }
        stargazerCount
        forkCount
        watchers {
          totalCount
        }
        openIssueCount: issues(states: OPEN) {
          totalCount
        }
        closedIssueCount: issues(states: CLOSED) {
          totalCount
        }
        openPullRequestCount: pullRequests(states: OPEN) {
          totalCount
        }
        mergedPullRequestCount: pullRequests(states: MERGED) {
          totalCount
        }
        releases(last: 1) {
          nodes {
            tagName
            name
            publishedAt
          }
        }
        pushedAt
        createdAt
        updatedAt
        isPrivate
        diskUsage
        licenseInfo {
          name
          spdxId
        }
      }
    }
  `;

  try {
    const data = await graphql<{ repository: any }>(query, {
      owner: config.owner,
      repo: config.repo,
    });

    const repo = data.repository;

    return {
      success: true,
      data: {
        name: repo.name,
        description: repo.description,
        url: repo.url,
        default_branch: repo.defaultBranchRef?.name,
        primary_language: repo.primaryLanguage?.name,
        language_color: repo.primaryLanguage?.color,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        watchers: repo.watchers?.totalCount || 0,
        issues: {
          open: repo.openIssueCount?.totalCount || 0,
          closed: repo.closedIssueCount?.totalCount || 0,
        },
        pull_requests: {
          open: repo.openPullRequestCount?.totalCount || 0,
          merged: repo.mergedPullRequestCount?.totalCount || 0,
        },
        latest_release: repo.releases?.nodes?.[0] || null,
        pushed_at: repo.pushedAt,
        created_at: repo.createdAt,
        updated_at: repo.updatedAt,
        is_private: repo.isPrivate,
        disk_usage_kb: repo.diskUsage,
        license: repo.licenseInfo,
      },
    };
  } catch (error) {
    console.error("[GitHub] GraphQL failed, falling back to REST:", error);
    return getRepositoryInfoREST();
  }
}

// Fallback REST implementation
async function getRepositoryInfoREST() {
  try {
    const { data } = await rest<RepositoryInfo>("");
    
    return {
      success: true,
      data: {
        name: data.name,
        description: data.description,
        url: data.html_url,
        default_branch: data.default_branch,
        primary_language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        watchers: data.watchers_count,
        open_issues: data.open_issues_count,
        pushed_at: data.pushed_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_private: data.private,
        license: data.license,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Deployment Tools
export async function getLatestDeployment() {
  try {
    const { data } = await rest<DeploymentInfo[]>("/deployments?per_page=1");
    
    if (!data || data.length === 0) {
      return { success: true, message: "No deployments found", data: null };
    }

    const deployment = data[0]!;
    const { data: statuses } = await rest<DeploymentStatusInfo[]>(`/deployments/${deployment.id}/statuses?per_page=1`, {}, false);

    return {
      success: true,
      data: {
        id: deployment.id,
        sha: deployment.sha,
        short_sha: deployment.sha.substring(0, 7),
        ref: deployment.ref,
        environment: deployment.environment,
        created_at: deployment.created_at,
        creator: deployment.creator.login,
        status: statuses[0]?.state || "unknown",
        description: statuses[0]?.description || "",
        target_url: statuses[0]?.target_url || "",
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function getDeploymentHistory(limit: number = 10) {
  try {
    const { data: deployments } = await rest<AnyRecord[]>(`/deployments?per_page=${limit}`);
    
    const enriched = await Promise.all(
      deployments.map(async (d: any) => {
        const { data: statuses } = await rest<DeploymentStatusInfo[]>(
          `/deployments/${d.id}/statuses?per_page=1`,
          {},
          false
        );
        return {
          id: d.id,
          sha: d.sha.substring(0, 7),
          ref: d.ref,
          environment: d.environment,
          created_at: d.created_at,
          creator: d.creator.login,
          status: statuses[0]?.state || "unknown",
        };
      })
    );

    return { success: true, count: enriched.length, data: enriched };
  } catch (error) {
    return handleError(error);
  }
}

export async function createDeployment(
  environment: string = "production",
  ref: string = "main",
  description: string = "Deployed via MCP",
  autoMerge: boolean = false
) {
  try {
    const { data } = await rest<{ id: number; url: string; status: string }>("/deployments", {
      method: "POST",
      body: JSON.stringify({
        ref,
        environment,
        description,
        auto_merge: autoMerge,
        required_contexts: [],
      }),
    }, false);

    // Invalidate deployment cache
    cache.invalidate("deployments");

    return {
      success: true,
      message: `Deployment created for ${environment}`,
      data: { id: data.id, url: data.url, status: data.status },
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Commit Tools with GraphQL
export async function getRecentCommits(limit: number = 10, branch: string = "main") {
  const query = `
    query($owner: String!, $repo: String!, $branch: String!, $limit: Int!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $branch) {
          target {
            ... on Commit {
              history(first: $limit) {
                edges {
                  node {
                    oid
                    message
                    messageHeadline
                    author {
                      name
                      email
                      date
                    }
                    committer {
                      name
                      date
                    }
                    additions
                    deletions
                    changedFiles
                    url
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphql<{ repository: any }>(query, {
      owner: config.owner,
      repo: config.repo,
      branch,
      limit,
    });

    const commits = data.repository?.ref?.target?.history?.edges || [];

    return {
      success: true,
      count: commits.length,
      data: commits.map((edge: any) => ({
        sha: edge.node.oid.substring(0, 7),
        full_sha: edge.node.oid,
        message: edge.node.messageHeadline,
        full_message: edge.node.message,
        author: edge.node.author.name,
        author_email: edge.node.author.email,
        date: edge.node.author.date,
        committer: edge.node.committer.name,
        commit_date: edge.node.committer.date,
        stats: {
          additions: edge.node.additions,
          deletions: edge.node.deletions,
          files_changed: edge.node.changedFiles,
        },
        url: edge.node.url,
      })),
    };
  } catch (error) {
    console.log("[GitHub] Falling back to REST for commits");
    return getCommitsREST(limit, branch);
  }
}

async function getCommitsREST(limit: number, branch: string) {
  try {
    const { data } = await rest<AnyRecord[]>(`/commits?sha=${branch}&per_page=${limit}`);
    
    return {
      success: true,
      count: data.length,
      data: data.map((c: any) => ({
        sha: c.sha.substring(0, 7),
        full_sha: c.sha,
        message: c.commit.message.split("\n")[0],
        full_message: c.commit.message,
        author: c.commit.author.name,
        author_email: c.commit.author.email,
        date: c.commit.author.date,
        url: c.html_url,
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Issue Tools
export async function getIssues(
  states: ("OPEN" | "CLOSED")[] = ["OPEN"],
  labels?: string[],
  limit: number = 20
) {
  const stateFilter = states.length === 1 ? states[0] : undefined;
  
  let endpoint = `/issues?per_page=${limit}`;
  if (stateFilter) endpoint += `&state=${stateFilter.toLowerCase()}`;
  if (labels?.length) endpoint += `&labels=${labels.join(",")}`;

  try {
    const { data } = await rest<AnyRecord[]>(endpoint);
    
    return {
      success: true,
      count: data.length,
      data: data.map((i: any) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l: any) => ({ name: l.name, color: l.color })),
        author: i.user.login,
        assignees: i.assignees.map((a: any) => a.login),
        comments_count: i.comments,
        created_at: i.created_at,
        updated_at: i.updated_at,
        closed_at: i.closed_at,
        url: i.html_url,
        body_preview: i.body?.substring(0, 200) + (i.body?.length > 200 ? "..." : ""),
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function createIssue(
  title: string,
  body: string,
  labels: string[] = [],
  assignees: string[] = []
) {
  try {
    const { data } = await rest<{ number: number; title: string; html_url: string }>("/issues", {
      method: "POST",
      body: JSON.stringify({ title, body, labels, assignees }),
    }, false);

    cache.invalidate("issues");

    return {
      success: true,
      message: `Issue #${data.number} created`,
      data: {
        number: data.number,
        title: data.title,
        url: data.html_url,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Pull Request Tools
export async function getPullRequests(
  state: "open" | "closed" | "all" = "open",
  limit: number = 10
) {
  try {
    const { data } = await rest<AnyRecord[]>(`/pulls?state=${state}&per_page=${limit}`);
    
    return {
      success: true,
      count: data.length,
      data: data.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        author: pr.user.login,
        head: pr.head.ref,
        base: pr.base.ref,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged: pr.merged,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        url: pr.html_url,
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Release Tools
export async function getReleases(limit: number = 5) {
  try {
    const { data } = await rest<AnyRecord[]>(`/releases?per_page=${limit}`);
    
    return {
      success: true,
      count: data.length,
      data: data.map((r: any) => ({
        id: r.id,
        tag: r.tag_name,
        name: r.name,
        body: r.body,
        draft: r.draft,
        prerelease: r.prerelease,
        author: r.author.login,
        created_at: r.created_at,
        published_at: r.published_at,
        url: r.html_url,
        assets: r.assets.map((a: any) => ({
          name: a.name,
          size: a.size,
          downloads: a.download_count,
          url: a.browser_download_url,
        })),
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

// Modern Workflow Actions
export async function triggerWorkflow(
  workflowId: string,
  ref: string = "main",
  inputs?: Record<string, string>
) {
  try {
    await rest<Record<string, never>>(`/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref, inputs }),
    }, false);

    return {
      success: true,
      message: `Workflow ${workflowId} triggered on ${ref}`,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function getWorkflowRuns(
  workflowId: string,
  limit: number = 10
) {
  try {
    const { data } = await rest<{ total_count: number; workflow_runs: AnyRecord[] }>(
      `/actions/workflows/${workflowId}/runs?per_page=${limit}`
    );
    
    return {
      success: true,
      count: data.total_count,
      data: data.workflow_runs.map((run: any) => ({
        id: run.id,
        name: run.name,
        number: run.run_number,
        status: run.status,
        conclusion: run.conclusion,
        branch: run.head_branch,
        commit_sha: run.head_sha.substring(0, 7),
        event: run.event,
        created_at: run.created_at,
        updated_at: run.updated_at,
        url: run.html_url,
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

// Webhook verification
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const expectedSig = "sha256=" + Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return timingSafeEqual(signature, expectedSig);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Utility functions
export async function compareBranches(base: string, head: string) {
  try {
    const { data } = await rest<{ ahead_by: number; behind_by: number; total_commits: number; files: AnyRecord[] }>(`/compare/${base}...${head}`);
    
    return {
      success: true,
      data: {
        ahead_by: data.ahead_by,
        behind_by: data.behind_by,
        total_commits: data.total_commits,
        files_changed: data.files.map((f: any) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function searchCode(query: string, limit: number = 10) {
  try {
    const { data } = await rest<{ total_count: number; items: AnyRecord[] }>(
      `/search/code?q=${encodeURIComponent(query)}&per_page=${limit}`,
      {},
      false
    );
    
    return {
      success: true,
      total_count: data.total_count,
      data: data.items.map((item: any) => ({
        name: item.name,
        path: item.path,
        url: item.html_url,
        repository: item.repository.full_name,
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

// Admin utilities
export function getCacheStats() {
  return cache.getStats();
}

export function clearCache(pattern?: string) {
  cache.invalidate(pattern);
  return { success: true, message: pattern ? `Cache cleared for pattern: ${pattern}` : "All cache cleared" };
}

export function getRateLimitInfo() {
  const info = rateLimiter.getInfo();
  return {
    success: true,
    data: info ? {
      limit: info.limit,
      remaining: info.remaining,
      used: info.used,
      reset_at: info.reset.toISOString(),
      reset_in_seconds: Math.ceil((info.reset.getTime() - Date.now()) / 1000),
    } : null,
  };
}

// Error handler helper
function handleError(error: unknown) {
  if (error instanceof GitHubError) {
    return {
      success: false,
      error: error.message,
      type: error.type,
      status_code: error.statusCode,
      details: error.response,
    };
  }
  
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
    type: "UNKNOWN_ERROR",
  };
}

// Export all tools
export const githubTools = {
  // Repository
  getRepositoryInfo,
  getRecentCommits,
  
  // Deployments
  getLatestDeployment,
  getDeploymentHistory,
  createDeployment,
  
  // Issues
  getIssues,
  createIssue,
  
  // Pull Requests
  getPullRequests,
  
  // Releases
  getReleases,
  
  // Workflows
  triggerWorkflow,
  getWorkflowRuns,
  
  // Utilities
  compareBranches,
  searchCode,
  verifyWebhookSignature,
  
  // Admin
  getCacheStats,
  clearCache,
  getRateLimitInfo,
};

// Default export
export default githubTools;
