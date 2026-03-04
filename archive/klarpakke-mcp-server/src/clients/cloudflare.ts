/**
 * Cloudflare Integration - DNS, CDN, Security, and Analytics
 */

const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
const CLOUDFLARE_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

if (!CLOUDFLARE_API_TOKEN) {
  console.warn(
    "CLOUDFLARE_API_TOKEN not set - Cloudflare tools will be disabled",
  );
}

if (!CLOUDFLARE_ZONE_ID) {
  console.warn("CLOUDFLARE_ZONE_ID not set - some features will be limited");
}

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface CloudflareSetting {
  id: string;
  value: any;
  editable: boolean;
  modified_on: string;
}

async function cloudflareFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!CLOUDFLARE_API_TOKEN) {
    throw new Error("Cloudflare not configured");
  }

  let url = `${CLOUDFLARE_API}${path}`;

  if (options.params) {
    const params = new URLSearchParams(options.params);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const error = data.errors?.[0]?.message || response.statusText;
    throw new Error(`Cloudflare API error: ${error}`);
  }

  return data.result;
}

// ==================== ZONES ====================

export interface Zone {
  id: string;
  name: string;
  status: "active" | "pending" | "initializing" | "moved";
  plan: {
    name: string;
  };
  created_on: string;
  activated_on?: string;
  development_mode: number;
  paused?: boolean;
  name_servers?: string[];
  original_name_servers?: string[];
}

export async function listZones(): Promise<Zone[]> {
  return cloudflareFetch("/zones");
}

export async function getZone(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<Zone> {
  return cloudflareFetch(`/zones/${zoneId}`);
}

export async function getZoneDetails(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  zone: Zone;
  settings: any;
  analytics: any;
}> {
  const [zone, settings] = await Promise.all([
    getZone(zoneId),
    cloudflareFetch(`/zones/${zoneId}/settings`),
  ]);

  return { zone, settings, analytics: {} };
}

// ==================== DNS RECORDS ====================

export interface DNSRecord {
  id: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA";
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  created_on?: string;
  modified_on?: string;
}

export async function listDNSRecords(
  zoneId: string = CLOUDFLARE_ZONE_ID,
  filters?: { type?: string; name?: string; content?: string },
): Promise<DNSRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.type) params.type = filters.type;
  if (filters?.name) params.name = filters.name;
  if (filters?.content) params.content = filters.content;

  return cloudflareFetch(`/zones/${zoneId}/dns_records`, { params });
}

export async function getDNSRecord(
  recordId: string,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<DNSRecord> {
  return cloudflareFetch(`/zones/${zoneId}/dns_records/${recordId}`);
}

export async function createDNSRecord(
  record: Omit<DNSRecord, "id">,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<DNSRecord> {
  return cloudflareFetch(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function updateDNSRecord(
  recordId: string,
  updates: Partial<DNSRecord>,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<DNSRecord> {
  return cloudflareFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteDNSRecord(
  recordId: string,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}

export async function importDNSRecords(
  records: Omit<DNSRecord, "id">[],
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  total_records_parsed: number;
  total_records_added: number;
  total_records_failed: number;
}> {
  return cloudflareFetch(`/zones/${zoneId}/dns_records/import`, {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

// ==================== CACHE PURGE ====================

export async function purgeAllCache(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{ id: string }> {
  return cloudflareFetch(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ purge_everything: true }),
  });
}

export async function purgeCacheByURL(
  urls: string[],
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{ id: string }> {
  return cloudflareFetch(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ files: urls }),
  });
}

export async function purgeCacheByTag(
  tags: string[],
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{ id: string }> {
  return cloudflareFetch(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
}

export async function purgeCacheByHost(
  hosts: string[],
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{ id: string }> {
  return cloudflareFetch(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ hosts }),
  });
}

// ==================== ANALYTICS ====================

export interface AnalyticsData {
  timeseries: Array<{
    since: string;
    until: string;
    requests: {
      all: number;
      cached: number;
      uncached: number;
    };
    bandwidth: {
      all: number;
      cached: number;
      uncached: number;
    };
    threats: {
      all: number;
      country: Record<string, number>;
      type: Record<string, number>;
    };
    pageviews: {
      all: number;
      search_engine: Record<string, number>;
    };
    uniques: {
      all: number;
    };
  }>;
  totals: {
    since: string;
    until: string;
    requests: number;
    bandwidth: number;
    threats: number;
    pageviews: number;
    uniques: number;
  };
}

export async function getZoneAnalytics(
  since: Date,
  until: Date,
  zoneId: string = CLOUDFLARE_ZONE_ID,
  continuous: boolean = true,
): Promise<AnalyticsData> {
  const params = {
    since: since.toISOString(),
    until: until.toISOString(),
    continuous: continuous.toString(),
  };

  return cloudflareFetch(`/zones/${zoneId}/analytics/dashboard`, { params });
}

export async function getAnalyticsSummary(days: number = 7): Promise<{
  totalRequests: number;
  totalBandwidth: number; // bytes
  cachedPercentage: number;
  threatsBlocked: number;
  uniqueVisitors: number;
  pageViews: number;
}> {
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

  const data = await getZoneAnalytics(since, until);

  const totals = data.totals;
  const cachedReqs = data.timeseries.reduce(
    (sum, t) => sum + t.requests.cached,
    0,
  );
  const totalReqs = data.timeseries.reduce((sum, t) => sum + t.requests.all, 0);

  return {
    totalRequests: totals.requests,
    totalBandwidth: totals.bandwidth,
    cachedPercentage:
      totalReqs > 0 ? Math.round((cachedReqs / totalReqs) * 100) : 0,
    threatsBlocked: totals.threats,
    uniqueVisitors: totals.uniques,
    pageViews: totals.pageviews,
  };
}

export async function getTopThreats(days: number = 7): Promise<
  Array<{
    country: string;
    count: number;
    percentage: number;
  }>
> {
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

  const data = await getZoneAnalytics(since, until);

  const countryThreats: Record<string, number> = {};
  data.timeseries.forEach((t) => {
    Object.entries(t.threats.country || {}).forEach(([country, count]) => {
      countryThreats[country] = (countryThreats[country] || 0) + count;
    });
  });

  const total = Object.values(countryThreats).reduce((a, b) => a + b, 0);

  return Object.entries(countryThreats)
    .map(([country, count]) => ({
      country,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ==================== SSL/TLS ====================

export type SSLMode = "off" | "flexible" | "full" | "strict" | "origin_pull";

export async function getSSLSettings(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  ssl: SSLMode;
  tls_1_3: "on" | "off" | "zrt";
  min_tls_version: "1.0" | "1.1" | "1.2" | "1.3";
  certificate_status?: string;
}> {
  const [ssl, tls13, minTls] = await Promise.all([
    cloudflareFetch<CloudflareSetting>(`/zones/${zoneId}/settings/ssl`),
    cloudflareFetch<CloudflareSetting>(`/zones/${zoneId}/settings/tls_1_3`),
    cloudflareFetch<CloudflareSetting>(
      `/zones/${zoneId}/settings/min_tls_version`,
    ),
  ]);

  return {
    ssl: ssl.value,
    tls_1_3: tls13.value,
    min_tls_version: minTls.value,
  };
}

export async function updateSSLSetting(
  setting: "ssl" | "tls_1_3" | "min_tls_version",
  value: string,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/settings/${setting}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

// ==================== FIREWALL RULES ====================

export interface FirewallRule {
  id: string;
  description: string;
  filter: {
    id: string;
    expression: string;
  };
  action: "block" | "challenge" | "js_challenge" | "allow" | "log" | "skip";
  priority: number;
  paused: boolean;
}

export async function listFirewallRules(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<FirewallRule[]> {
  return cloudflareFetch(`/zones/${zoneId}/firewall/rules`);
}

export async function createFirewallRule(
  rule: Omit<FirewallRule, "id">,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<FirewallRule> {
  return cloudflareFetch(`/zones/${zoneId}/firewall/rules`, {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateFirewallRule(
  ruleId: string,
  updates: Partial<FirewallRule>,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<FirewallRule> {
  return cloudflareFetch(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteFirewallRule(
  ruleId: string,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
    method: "DELETE",
  });
}

// ==================== RATE LIMITING ====================

export interface RateLimitRule {
  id: string;
  description: string;
  match: {
    request: {
      methods: string[];
      schemes: string[];
      url: string;
    };
  };
  threshold: number;
  period: number;
  action: {
    mode: "simulate" | "challenge" | "js_challenge" | "block";
    timeout: number;
  };
  disabled: boolean;
}

export async function listRateLimitRules(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<RateLimitRule[]> {
  return cloudflareFetch(`/zones/${zoneId}/rate_limits`);
}

export async function createRateLimitRule(
  rule: Omit<RateLimitRule, "id">,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<RateLimitRule> {
  return cloudflareFetch(`/zones/${zoneId}/rate_limits`, {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

// ==================== PAGE RULES ====================

export interface PageRule {
  id: string;
  targets: Array<{
    target: "url";
    constraint: {
      operator: "matches" | "contains" | "equals";
      value: string;
    };
  }>;
  actions: Array<{
    id: string;
    value?: any;
  }>;
  priority: number;
  status: "active" | "disabled";
}

export async function listPageRules(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<PageRule[]> {
  return cloudflareFetch(`/zones/${zoneId}/pagerules`);
}

export async function createPageRule(
  rule: Omit<PageRule, "id">,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<PageRule> {
  return cloudflareFetch(`/zones/${zoneId}/pagerules`, {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

// ==================== SECURITY CENTER ====================

export async function getSecurityEvents(
  since: Date,
  until: Date,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<any[]> {
  const params = {
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: "100",
  };

  return cloudflareFetch(`/zones/${zoneId}/security/events`, { params });
}

export async function getSecurityLevel(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<string> {
  const setting = await cloudflareFetch<CloudflareSetting>(
    `/zones/${zoneId}/settings/security_level`,
  );
  return setting.value;
}

export async function setSecurityLevel(
  level: "off" | "essentially_off" | "low" | "medium" | "high" | "under_attack",
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/settings/security_level`, {
    method: "PATCH",
    body: JSON.stringify({ value: level }),
  });
}

// ==================== DEVELOPMENT MODE ====================

export async function getDevelopmentMode(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<boolean> {
  const setting = await cloudflareFetch<CloudflareSetting>(
    `/zones/${zoneId}/settings/development_mode`,
  );
  return setting.value === "on";
}

export async function setDevelopmentMode(
  enabled: boolean,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/settings/development_mode`, {
    method: "PATCH",
    body: JSON.stringify({ value: enabled ? "on" : "off" }),
  });
}

// ==================== ALWAYS ONLINE ====================

export async function getAlwaysOnlineStatus(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<boolean> {
  const setting = await cloudflareFetch<CloudflareSetting>(
    `/zones/${zoneId}/settings/always_online`,
  );
  return setting.value === "on";
}

// ==================== BROWSER CACHE TTL ====================

export async function getBrowserCacheTTL(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<number> {
  const setting = await cloudflareFetch<CloudflareSetting>(
    `/zones/${zoneId}/settings/browser_cache_ttl`,
  );
  return setting.value;
}

export async function setBrowserCacheTTL(
  seconds: number,
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await cloudflareFetch(`/zones/${zoneId}/settings/browser_cache_ttl`, {
    method: "PATCH",
    body: JSON.stringify({ value: seconds }),
  });
}

// ==================== LOAD BALANCING (Enterprise) ====================

export async function listLoadBalancers(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<any[]> {
  return cloudflareFetch(`/zones/${zoneId}/load_balancers`);
}

// ==================== HEALTH CHECKS ====================

export async function listHealthChecks(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<any[]> {
  return cloudflareFetch(`/zones/${zoneId}/healthchecks`);
}

// ==================== WORKERS (If applicable) ====================

export async function listWorkers(): Promise<any[]> {
  // Workers are account-level, not zone-level
  return cloudflareFetch("/workers/scripts");
}

// ==================== STREAMING (Video) ====================

export async function listStreamVideos(): Promise<any[]> {
  return cloudflareFetch("/stream");
}

// ==================== IMAGES ====================

export async function listImages(): Promise<any[]> {
  return cloudflareFetch("/images/v1");
}

// ==================== REALTIME STATUS ====================

export async function getZoneStatus(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  status: string;
  paused: boolean;
  name_servers: string[];
  original_name_servers?: string[];
}> {
  const zone = await cloudflareFetch<Zone>(`/zones/${zoneId}`);
  return {
    status: zone.status,
    paused: zone.paused || false,
    name_servers: zone.name_servers || [],
    original_name_servers: zone.original_name_servers,
  };
}

// ==================== QUICK ACTIONS ====================

export async function quickPurgeAndCheck(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  purgeId: string;
  status: string;
}> {
  // 1. Purge cache
  const purge = await purgeAllCache(zoneId);

  // 2. Check zone status
  const status = await getZoneStatus(zoneId);

  return {
    purgeId: purge.id,
    status: status.status,
  };
}

export async function enableUnderAttackMode(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await setSecurityLevel("under_attack", zoneId);
}

export async function disableUnderAttackMode(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<void> {
  await setSecurityLevel("medium", zoneId);
}

// ==================== DIAGNOSTICS ====================

export async function runDiagnostics(
  zoneId: string = CLOUDFLARE_ZONE_ID,
): Promise<{
  zone: Zone;
  ssl: any;
  securityLevel: string;
  devMode: boolean;
  alwaysOnline: boolean;
  cacheTtl: number;
  dnsRecords: number;
  firewallRules: number;
  rateLimits: number;
  pageRules: number;
}> {
  const [
    zone,
    ssl,
    securityLevel,
    devMode,
    alwaysOnline,
    cacheTtl,
    dnsRecords,
    firewallRules,
    rateLimits,
    pageRules,
  ] = await Promise.all([
    getZone(zoneId),
    getSSLSettings(zoneId),
    getSecurityLevel(zoneId),
    getDevelopmentMode(zoneId),
    getAlwaysOnlineStatus(zoneId),
    getBrowserCacheTTL(zoneId),
    listDNSRecords(zoneId),
    listFirewallRules(zoneId),
    listRateLimitRules(zoneId),
    listPageRules(zoneId),
  ]);

  return {
    zone,
    ssl,
    securityLevel,
    devMode,
    alwaysOnline,
    cacheTtl,
    dnsRecords: dnsRecords.length,
    firewallRules: firewallRules.length,
    rateLimits: rateLimits.length,
    pageRules: pageRules.length,
  };
}
