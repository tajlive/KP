#!/usr/bin/env node
/**
 * Klarpakke MCP Server v1.0
 *
 * Gir AI-agenter (KIMI, Claude, Perplexity) tilgang til:
 * - Supabase database (read-only)
 * - Trading sessions og metrics
 * - System status og health checks
 * - GitHub commits og issues
 * - Daglig briefing
 *
 * Kjører via stdio-transport for MCP-protocol.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
// ════════════════════════════════════════════════════════════════
// KONFIGURASJON
// ════════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Mangler Supabase credentials i environment variables');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// ════════════════════════════════════════════════════════════════
// MCP SERVER OPPSETT
// ════════════════════════════════════════════════════════════════
const server = new Server({
    name: 'klarpakke-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// ════════════════════════════════════════════════════════════════
// VERKTØY-DEFINISJONER
// ════════════════════════════════════════════════════════════════
const TOOLS = [
    // ────────────────────────────────────────────────────────────
    // SUPABASE VERKTØY
    // ────────────────────────────────────────────────────────────
    {
        name: 'supabase_query',
        description: 'Kjør SELECT-query mot Klarpakke Supabase database. Kun read-only.',
        inputSchema: {
            type: 'object',
            properties: {
                table: {
                    type: 'string',
                    description: 'Tabellnavn (f.eks. profiles, unified_trading_sessions, unified_trades)',
                },
                columns: {
                    type: 'string',
                    description: 'Kolonner å hente (default: *)',
                    default: '*',
                },
                filters: {
                    type: 'object',
                    description: 'WHERE-betingelser som objekt (f.eks. {"status": "active"})',
                },
                limit: {
                    type: 'number',
                    description: 'Max antall rader (default 20, max 100)',
                    default: 20,
                },
                orderBy: {
                    type: 'object',
                    description: 'Sortering: {column: "created_at", ascending: false}',
                },
            },
            required: ['table'],
        },
    },
    {
        name: 'supabase_get_tables',
        description: 'List alle tilgjengelige tabeller i Klarpakke database',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'supabase_get_schema',
        description: 'Hent kolonner og datatyper for en spesifikk tabell',
        inputSchema: {
            type: 'object',
            properties: {
                table: { type: 'string', description: 'Tabellnavn' },
            },
            required: ['table'],
        },
    },
    // ────────────────────────────────────────────────────────────
    // TRADING VERKTØY
    // ────────────────────────────────────────────────────────────
    {
        name: 'trading_get_sessions',
        description: 'Hent trading-sesjoner med filtrering på mode og status',
        inputSchema: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['paper', 'live', 'all'],
                    description: 'Filtrer på trading mode',
                    default: 'all',
                },
                status: {
                    type: 'string',
                    enum: ['active', 'paused', 'stopped', 'all'],
                    description: 'Filtrer på status',
                    default: 'all',
                },
                limit: {
                    type: 'number',
                    description: 'Max antall sessions (default 50)',
                    default: 50,
                },
            },
        },
    },
    {
        name: 'trading_get_metrics',
        description: 'Hent aggregerte trading metrics for en periode',
        inputSchema: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['24h', '7d', '30d', 'all'],
                    description: 'Tidsperiode for metrics',
                    default: '24h',
                },
            },
        },
    },
    {
        name: 'trading_get_recent_trades',
        description: 'Hent de siste trades på tvers av alle sessions',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Antall trades (default 20)',
                    default: 20,
                },
                mode: {
                    type: 'string',
                    enum: ['paper', 'live', 'all'],
                    default: 'all',
                },
            },
        },
    },
    // ────────────────────────────────────────────────────────────
    // BRUKER VERKTØY
    // ────────────────────────────────────────────────────────────
    {
        name: 'users_get_stats',
        description: 'Hent brukerstatistikk (anonymisert)',
        inputSchema: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['today', '7d', '30d', 'all'],
                    default: 'today',
                },
            },
        },
    },
    // ────────────────────────────────────────────────────────────
    // SYSTEM VERKTØY
    // ────────────────────────────────────────────────────────────
    {
        name: 'system_health_check',
        description: 'Sjekk om klarpakke.no er oppe og responderer',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'system_get_status',
        description: 'Hent fullstendig systemstatus: Vercel + Supabase + Trading',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'system_daily_brief',
        description: 'Hent daglig briefing: nye brukere, trades, revenue, feil',
        inputSchema: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'Dato i format YYYY-MM-DD (default: i dag)',
                },
            },
        },
    },
    // ────────────────────────────────────────────────────────────
    // GITHUB VERKTØY
    // ────────────────────────────────────────────────────────────
    {
        name: 'github_recent_commits',
        description: 'Hent de siste commits fra main branch',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Antall commits (default 10)',
                    default: 10,
                },
            },
        },
    },
    {
        name: 'github_open_issues',
        description: 'Hent åpne GitHub issues',
        inputSchema: {
            type: 'object',
            properties: {
                state: {
                    type: 'string',
                    enum: ['open', 'closed', 'all'],
                    default: 'open',
                },
            },
        },
    },
];
// ════════════════════════════════════════════════════════════════
// REQUEST HANDLERS
// ════════════════════════════════════════════════════════════════
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            // ──────────────────────────────────────────────────────
            // SUPABASE
            // ──────────────────────────────────────────────────────
            case 'supabase_query': {
                const { table, columns = '*', filters, limit = 20, orderBy } = args;
                let query = supabase.from(table).select(columns).limit(Math.min(limit, 100));
                if (filters && typeof filters === 'object') {
                    Object.entries(filters).forEach(([key, value]) => {
                        query = query.eq(key, value);
                    });
                }
                if (orderBy && orderBy.column) {
                    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
                }
                const { data, error } = await query;
                if (error)
                    throw error;
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                table,
                                count: data?.length ?? 0,
                                data,
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'supabase_get_tables': {
                const tables = [
                    'profiles',
                    'unified_trading_sessions',
                    'unified_trades',
                    'unified_exchange_keys',
                    'strategy_templates',
                    'unified_copy_follows',
                    'unified_circuit_breaker_logs',
                ];
                return {
                    content: [{ type: 'text', text: JSON.stringify({ tables }, null, 2) }],
                };
            }
            case 'supabase_get_schema': {
                const { table } = args;
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                if (error)
                    throw error;
                const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
                return {
                    content: [
                        { type: 'text', text: JSON.stringify({ table, columns }, null, 2) },
                    ],
                };
            }
            // ──────────────────────────────────────────────────────
            // TRADING
            // ──────────────────────────────────────────────────────
            case 'trading_get_sessions': {
                const { mode = 'all', status = 'all', limit = 50 } = args;
                let query = supabase
                    .from('unified_trading_sessions')
                    .select('*')
                    .limit(limit)
                    .order('created_at', { ascending: false });
                if (mode !== 'all')
                    query = query.eq('mode', mode);
                if (status !== 'all')
                    query = query.eq('status', status);
                const { data, error } = await query;
                if (error)
                    throw error;
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                sessions: data,
                                count: data?.length ?? 0,
                                filters: { mode, status },
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'trading_get_metrics': {
                const { period = '24h' } = args;
                const now = new Date();
                let since;
                switch (period) {
                    case '24h':
                        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                    case '7d':
                        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    default: since = new Date(0);
                }
                const { data: trades, error } = await supabase
                    .from('unified_trades')
                    .select('realized_pnl, mode, created_at')
                    .gte('created_at', since.toISOString());
                if (error)
                    throw error;
                const metrics = {
                    period,
                    total_trades: trades?.length ?? 0,
                    paper_trades: trades?.filter((t) => t.mode === 'paper').length ?? 0,
                    live_trades: trades?.filter((t) => t.mode === 'live').length ?? 0,
                    total_pnl: trades?.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0) ?? 0,
                    paper_pnl: trades?.filter((t) => t.mode === 'paper').reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0) ?? 0,
                    live_pnl: trades?.filter((t) => t.mode === 'live').reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0) ?? 0,
                };
                return {
                    content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }],
                };
            }
            case 'trading_get_recent_trades': {
                const { limit = 20, mode = 'all' } = args;
                let query = supabase
                    .from('unified_trades')
                    .select('*')
                    .limit(limit)
                    .order('created_at', { ascending: false });
                if (mode !== 'all')
                    query = query.eq('mode', mode);
                const { data, error } = await query;
                if (error)
                    throw error;
                return {
                    content: [{ type: 'text', text: JSON.stringify({ trades: data }, null, 2) }],
                };
            }
            // ──────────────────────────────────────────────────────
            // USERS
            // ──────────────────────────────────────────────────────
            case 'users_get_stats': {
                const { period = 'today' } = args;
                const now = new Date();
                let since;
                switch (period) {
                    case 'today':
                        since = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case '7d':
                        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    default: since = new Date(0);
                }
                const { data: profiles, error } = await supabase
                    .from('profiles')
                    .select('created_at, subscription_status')
                    .gte('created_at', since.toISOString());
                if (error)
                    throw error;
                const stats = {
                    period,
                    new_users: profiles?.length ?? 0,
                    active_subscriptions: profiles?.filter((p) => p.subscription_status === 'active').length ?? 0,
                };
                return {
                    content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
                };
            }
            // ──────────────────────────────────────────────────────
            // SYSTEM
            // ──────────────────────────────────────────────────────
            case 'system_health_check': {
                try {
                    const response = await fetch('https://www.klarpakke.no/api/health');
                    const status = {
                        url: 'https://www.klarpakke.no',
                        status_code: response.status,
                        ok: response.ok,
                        checked_at: new Date().toISOString(),
                    };
                    return {
                        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
                    };
                }
                catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    error: 'Kunne ikke nå klarpakke.no',
                                    details: error instanceof Error ? error.message : String(error),
                                }, null, 2),
                            },
                        ],
                        isError: true,
                    };
                }
            }
            case 'system_get_status': {
                const [healthCheck, activeSessions, recentTrades] = await Promise.all([
                    fetch('https://www.klarpakke.no/api/health').then(r => r.status).catch(() => 0),
                    supabase.from('unified_trading_sessions').select('id').eq('status', 'active'),
                    supabase.from('unified_trades').select('id').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
                ]);
                const status = {
                    vercel: healthCheck === 200 ? '✅ Online' : '❌ Nede',
                    supabase: activeSessions.error ? '❌ Feil' : '✅ OK',
                    active_trading_sessions: activeSessions.data?.length ?? 0,
                    trades_24h: recentTrades.data?.length ?? 0,
                    checked_at: new Date().toISOString(),
                };
                return {
                    content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
                };
            }
            case 'system_daily_brief': {
                const { date } = args;
                const targetDate = date ? new Date(date) : new Date();
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
                const [users, trades, sessions] = await Promise.all([
                    supabase.from('profiles').select('id').gte('created_at', startOfDay).lte('created_at', endOfDay),
                    supabase.from('unified_trades').select('realized_pnl, mode').gte('created_at', startOfDay).lte('created_at', endOfDay),
                    supabase.from('unified_trading_sessions').select('mode, status'),
                ]);
                const brief = {
                    date: targetDate.toISOString().split('T')[0],
                    new_users: users.data?.length ?? 0,
                    trades_today: trades.data?.length ?? 0,
                    total_pnl: trades.data?.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0) ?? 0,
                    active_sessions: sessions.data?.filter((s) => s.status === 'active').length ?? 0,
                    paper_sessions: sessions.data?.filter((s) => s.mode === 'paper' && s.status === 'active').length ?? 0,
                    live_sessions: sessions.data?.filter((s) => s.mode === 'live' && s.status === 'active').length ?? 0,
                };
                return {
                    content: [{ type: 'text', text: JSON.stringify(brief, null, 2) }],
                };
            }
            // ──────────────────────────────────────────────────────
            // GITHUB
            // ──────────────────────────────────────────────────────
            case 'github_recent_commits': {
                const { limit = 10 } = args;
                if (!GITHUB_TOKEN) {
                    return {
                        content: [
                            { type: 'text', text: JSON.stringify({ error: 'GITHUB_TOKEN ikke satt' }, null, 2) },
                        ],
                        isError: true,
                    };
                }
                const response = await fetch(`https://api.github.com/repos/tomarnejensen/klarpakke/commits?per_page=${limit}`, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
                if (!response.ok)
                    throw new Error(`GitHub API feil: ${response.status}`);
                const commits = await response.json();
                const simplified = commits.map((c) => ({
                    sha: c.sha.substring(0, 7),
                    message: c.commit.message.split('\n')[0],
                    author: c.commit.author.name,
                    date: c.commit.author.date,
                    url: c.html_url,
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ commits: simplified }, null, 2) }],
                };
            }
            case 'github_open_issues': {
                const { state = 'open' } = args;
                if (!GITHUB_TOKEN) {
                    return {
                        content: [
                            { type: 'text', text: JSON.stringify({ error: 'GITHUB_TOKEN ikke satt' }, null, 2) },
                        ],
                        isError: true,
                    };
                }
                const response = await fetch(`https://api.github.com/repos/tomarnejensen/klarpakke/issues?state=${state}`, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
                if (!response.ok)
                    throw new Error(`GitHub API feil: ${response.status}`);
                const issues = await response.json();
                const simplified = issues.map((i) => ({
                    number: i.number,
                    title: i.title,
                    state: i.state,
                    created_at: i.created_at,
                    url: i.html_url,
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ issues: simplified }, null, 2) }],
                };
            }
            default:
                throw new Error(`Ukjent verktøy: ${name}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[MCP Error] ${name}:`, message);
        return {
            content: [{ type: 'text', text: `❌ Feil: ${message}` }],
            isError: true,
        };
    }
});
// ════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Klarpakke MCP Server v1.0 kjører');
    console.error(`📊 ${TOOLS.length} verktøy tilgjengelig`);
    console.error('🔌 Supabase: ' + (SUPABASE_URL ? 'Tilkoblet' : 'Ikke konfigurert'));
    console.error('🐙 GitHub: ' + (GITHUB_TOKEN ? 'Autentisert' : 'Ikke autentisert (valgfritt)'));
}
main().catch((error) => {
    console.error('💥 Fatal feil:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map