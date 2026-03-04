/**
 * Cloudflare API Tools for MCP
 * Provides CLI access to Cloudflare operations
 */
export interface CloudflareToolDefinition {
    name: string;
    description: string;
    handler: (input: Record<string, unknown>) => Promise<string>;
}
export declare const cloudflareTools: CloudflareToolDefinition[];
/**
 * Cloudflare Dashboard Links
 * Quick reference for manual operations
 */
export declare const cloudflareLinks: {
    dashboard: string;
    apiTokens: string;
    pages: string;
    workers: string;
    kv: string;
    analytics: string;
};
/**
 * Common Cloudflare Operations
 */
export declare const commonOperations: {
    deployPages: string;
    deployWorkers: string;
    tailLogs: string;
    listSecrets: string;
    addSecret: string;
    deleteSecret: string;
    checkStatus: string;
};
//# sourceMappingURL=cloudflare-tools.d.ts.map