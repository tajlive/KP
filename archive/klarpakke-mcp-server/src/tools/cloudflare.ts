/**
 * Cloudflare Tools - DNS, Cache, Security, and Analytics
 */

import * as cf from '../clients/cloudflare.ts';
import type { ToolOutput } from '../types.ts';

const ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID');

// ==================== ZONE MANAGEMENT ====================

export async function getZoneInfo(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      const zones = await cf.listZones();
      return {
        content: [{
          type: 'text',
          text: `📋 Available Zones (${zones.length}):\n\n${zones.map(z => `• ${z.name} (ID: ${z.id})\n  Status: ${z.status}\n  Plan: ${z.plan.name}`).join('\n\n')}`,
        }],
      };
    }

    const zone = await cf.getZone(ZONE_ID);
    const status = await cf.getZoneStatus(ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🌐 Zone: ${zone.name}

Status: ${zone.status} ${zone.status === 'active' ? '✅' : '⚠️'}
Plan: ${zone.plan.name}
Created: ${new Date(zone.created_on).toLocaleDateString()}
${zone.activated_on ? `Activated: ${new Date(zone.activated_on).toLocaleDateString()}` : 'Not activated'}

Name Servers:
${status.name_servers.map(ns => `  • ${ns}`).join('\n')}

Paused: ${status.paused ? 'Yes ⚠️' : 'No ✅'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function runCloudflareDiagnostics(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const diag = await cf.runDiagnostics(ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🔍 Cloudflare Diagnostics for ${diag.zone.name}

📊 Zone Status:
  Status: ${diag.zone.status} ${diag.zone.status === 'active' ? '✅' : '⚠️'}
  Development Mode: ${diag.devMode ? 'ON ⚠️' : 'OFF ✅'}

🔒 SSL/TLS:
  Mode: ${diag.ssl.ssl}
  TLS 1.3: ${diag.ssl.tls_1_3}
  Min TLS: ${diag.ssl.min_tls_version}

🛡️ Security:
  Security Level: ${diag.securityLevel}
  Always Online: ${diag.alwaysOnline ? 'ON ✅' : 'OFF'}

⚡ Performance:
  Browser Cache TTL: ${diag.cacheTtl} seconds

📋 Configuration:
  DNS Records: ${diag.dnsRecords}
  Firewall Rules: ${diag.firewallRules}
  Rate Limits: ${diag.rateLimits}
  Page Rules: ${diag.pageRules}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== DNS MANAGEMENT ====================

export async function listDNSRecords(args: { type?: string; name?: string }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const records = await cf.listDNSRecords(ZONE_ID, args);

    const list = records.map(r => {
      const proxied = r.proxied ? '📡' : '🔓';
      return `${proxied} ${r.type.padEnd(6)} ${r.name.padEnd(30)} → ${r.content.slice(0, 40)}${r.content.length > 40 ? '...' : ''} (TTL: ${r.ttl})`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `📋 DNS Records (${records.length}):\n\nLegend: 📡 Proxied | 🔓 DNS Only\n\n${list || 'No records found'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function createDNSRecord(args: {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const record = await cf.createDNSRecord({
      type: args.type as any,
      name: args.name,
      content: args.content,
      ttl: args.ttl || 1,
      proxied: args.proxied ?? false,
    }, ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `✅ DNS Record Created

Type: ${record.type}
Name: ${record.name}
Content: ${record.content}
TTL: ${record.ttl}
Proxied: ${record.proxied ? 'Yes' : 'No'}
ID: ${record.id}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function deleteDNSRecord(args: { record_id: string }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    await cf.deleteDNSRecord(args.record_id, ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🗑️ DNS Record Deleted

ID: ${args.record_id}
Status: Successfully deleted`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== CACHE MANAGEMENT ====================

export async function purgeAllCache(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const result = await cf.purgeAllCache(ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🧹 All Cache Purged ✅

Purge ID: ${result.id}
Scope: Entire zone
Status: Success

All cached content will be fetched fresh from origin on next request.`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function purgeCacheByURL(args: { urls: string[] }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const result = await cf.purgeCacheByURL(args.urls, ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🧹 Cache Purged for URLs ✅

Purge ID: ${result.id}
URLs purged: ${args.urls.length}

${args.urls.map(u => `  • ${u}`).join('\n')}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== ANALYTICS ====================

export async function getCloudflareAnalytics(args: { days?: number }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const days = args.days || 7;
    const summary = await cf.getAnalyticsSummary(days);

    // Format bandwidth
    const bandwidthGB = (summary.totalBandwidth / 1024 / 1024 / 1024).toFixed(2);

    return {
      content: [{
        type: 'text',
        text: `📊 Cloudflare Analytics (Last ${days} Days)

🌐 Traffic:
  Total Requests: ${summary.totalRequests.toLocaleString()}
  Unique Visitors: ${summary.uniqueVisitors.toLocaleString()}
  Page Views: ${summary.pageViews.toLocaleString()}
  
📦 Bandwidth:
  Total: ${bandwidthGB} GB
  Cached: ${summary.cachedPercentage}%
  Uncached: ${100 - summary.cachedPercentage}%

🛡️ Security:
  Threats Blocked: ${summary.threatsBlocked.toLocaleString()}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function getTopThreats(args: { days?: number }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const threats = await cf.getTopThreats(args.days || 7);

    if (threats.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '🛡️ No threats detected! Your site is safe. ✅',
        }],
      };
    }

    const list = threats.map((t, i) => `${i + 1}. ${t.country}: ${t.count.toLocaleString()} (${t.percentage}%)`).join('\n');

    return {
      content: [{
        type: 'text',
        text: `🛡️ Top Threat Sources (Last ${args.days || 7} Days)\n\n${list}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== SECURITY ====================

export async function getSecuritySettings(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const [ssl, securityLevel, devMode] = await Promise.all([
      cf.getSSLSettings(ZONE_ID),
      cf.getSecurityLevel(ZONE_ID),
      cf.getDevelopmentMode(ZONE_ID),
    ]);

    const sslEmoji = ssl.ssl === 'strict' ? '🔒' : ssl.ssl === 'full' ? '🔐' : '⚠️';

    return {
      content: [{
        type: 'text',
        text: `🔒 Security Settings for Zone

${sslEmoji} SSL/TLS:
  Mode: ${ssl.ssl}
  TLS 1.3: ${ssl.tls_1_3}
  Min TLS Version: ${ssl.min_tls_version}

🛡️ Security Level: ${securityLevel}

⚠️ Development Mode: ${devMode ? 'ON' : 'OFF'}
  ${devMode ? '⚠️ Cache is bypassed!' : '✅ Cache active'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function setSecurityLevel(args: { level: 'off' | 'low' | 'medium' | 'high' | 'under_attack' }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    await cf.setSecurityLevel(args.level, ZONE_ID);

    const levelDescriptions: Record<string, string> = {
      off: 'Only threats against specific URLs will be challenged',
      low: 'Most threats will be challenged',
      medium: 'Some legitimate visitors may see a challenge',
      high: 'Many legitimate visitors will see a challenge',
      under_attack: 'All visitors will see an interstitial page (DDoS mode)',
    };

    return {
      content: [{
        type: 'text',
        text: `🛡️ Security Level Updated

New Level: ${args.level}

${levelDescriptions[args.level]}

${args.level === 'under_attack' ? '⚠️ Under Attack Mode is active - visitors will see a waiting page' : ''}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function toggleDevelopmentMode(args: { enabled: boolean }): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    await cf.setDevelopmentMode(args.enabled, ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `⚠️ Development Mode ${args.enabled ? 'ENABLED' : 'DISABLED'}

${args.enabled 
  ? '⚠️ WARNING: Cache is now BYPASSED!\n\nAll requests will go directly to origin.\nRemember to turn this OFF when done testing.' 
  : '✅ Cache is now ACTIVE\n\nRequests will be served from Cloudflare cache.'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== FIREWALL ====================

export async function listFirewallRules(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const rules = await cf.listFirewallRules(ZONE_ID);

    if (rules.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '🛡️ No firewall rules configured.',
        }],
      };
    }

    const list = rules.map(r => `
${r.paused ? '⏸️' : '✅'} ${r.description}
  Action: ${r.action}
  Priority: ${r.priority}
  Expression: ${r.filter.expression.slice(0, 60)}${r.filter.expression.length > 60 ? '...' : ''}
  ID: ${r.id}`).join('\n');

    return {
      content: [{
        type: 'text',
        text: `🛡️ Firewall Rules (${rules.length}):\n${list}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function createFirewallRule(args: {
  description: string;
  expression: string;
  action: 'block' | 'challenge' | 'js_challenge' | 'allow' | 'log';
  priority?: number;
}): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const rule = await cf.createFirewallRule({
      description: args.description,
      filter: { id: '', expression: args.expression },
      action: args.action,
      priority: args.priority || 100,
      paused: false,
    }, ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🛡️ Firewall Rule Created

Description: ${rule.description}
Action: ${rule.action}
Priority: ${rule.priority}
Expression: ${rule.filter.expression}
ID: ${rule.id}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== PAGE RULES ====================

export async function listPageRules(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const rules = await cf.listPageRules(ZONE_ID);

    if (rules.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '📄 No page rules configured.',
        }],
      };
    }

    const list = rules.map(r => `
${r.status === 'active' ? '✅' : '⏸️'} Priority ${r.priority}: ${r.targets[0].constraint.value}
  Actions: ${r.actions.map(a => a.id).join(', ')}
  ID: ${r.id}`).join('\n');

    return {
      content: [{
        type: 'text',
        text: `📄 Page Rules (${rules.length}):\n${list}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

// ==================== QUICK ACTIONS ====================

export async function enableUnderAttackMode(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    await cf.enableUnderAttackMode(ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🚨 UNDER ATTACK MODE ENABLED

All visitors will now see an interstitial page while Cloudflare analyzes traffic.

⚠️ This may affect legitimate users!

Remember to disable when the attack is over:
  "Set security level to medium"`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function quickPurgeAndCheck(): Promise<ToolOutput> {
  try {
    if (!ZONE_ID) {
      return { content: [{ type: 'text', text: '⚠️ CLOUDFLARE_ZONE_ID not set' }], isError: true };
    }

    const result = await cf.quickPurgeAndCheck(ZONE_ID);

    return {
      content: [{
        type: 'text',
        text: `🧹 Quick Purge & Check Complete ✅

Purge ID: ${result.purgeId}
Zone Status: ${result.status}

Cache has been purged and zone is ${result.status === 'active' ? 'healthy ✅' : 'not active ⚠️'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}
