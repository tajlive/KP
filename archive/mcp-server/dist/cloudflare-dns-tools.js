import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_API_BASE = "https://api.cloudflare.com/client/v4";
export const cloudflareDnsTools = [
    {
        name: "cf_dns_list_zones",
        description: "List all Cloudflare zones (domains)",
        input_schema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "cf_dns_list_records",
        description: "List DNS records for a zone",
        input_schema: {
            type: "object",
            properties: {
                zone_id: {
                    type: "string",
                    description: "Cloudflare Zone ID",
                },
            },
            required: ["zone_id"],
        },
    },
    {
        name: "cf_dns_create_record",
        description: "Create a new DNS record",
        input_schema: {
            type: "object",
            properties: {
                zone_id: { type: "string", description: "Zone ID" },
                type: { type: "string", description: "Record type (A, AAAA, CNAME, etc.)" },
                name: { type: "string", description: "DNS record name" },
                content: { type: "string", description: "Record content (IP or domain)" },
                ttl: { type: "number", description: "TTL in seconds (default: 3600)" },
                proxied: { type: "boolean", description: "Enable Cloudflare proxy (default: false)" },
            },
            required: ["zone_id", "type", "name", "content"],
        },
    },
    {
        name: "cf_dns_update_record",
        description: "Update an existing DNS record",
        input_schema: {
            type: "object",
            properties: {
                zone_id: { type: "string" },
                record_id: { type: "string" },
                type: { type: "string" },
                name: { type: "string" },
                content: { type: "string" },
                ttl: { type: "number" },
                proxied: { type: "boolean" },
            },
            required: ["zone_id", "record_id"],
        },
    },
    {
        name: "cf_dns_delete_record",
        description: "Delete a DNS record",
        input_schema: {
            type: "object",
            properties: {
                zone_id: { type: "string" },
                record_id: { type: "string" },
            },
            required: ["zone_id", "record_id"],
        },
    },
    {
        name: "cf_dns_setup_cloud_run",
        description: "Automatically setup DNS for Cloud Run (4 A records)",
        input_schema: {
            type: "object",
            properties: {
                zone_id: { type: "string", description: "Cloudflare Zone ID" },
                subdomain: { type: "string", description: "Subdomain (e.g., 'www')" },
            },
            required: ["zone_id", "subdomain"],
        },
    },
];
async function cfApiRequest(endpoint, method = "GET", body) {
    const url = `${CF_API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "Cloudflare API error");
    }
    return data.result;
}
export async function executeCloudflareDnsTool(name, args) {
    try {
        if (!CF_API_TOKEN) {
            return "Error: CLOUDFLARE_API_TOKEN not set";
        }
        switch (name) {
            case "cf_dns_list_zones": {
                const data = await cfApiRequest("/zones");
                const zones = data.result.map((z) => ({
                    id: z.id,
                    name: z.name,
                    status: z.status,
                }));
                return JSON.stringify({ zones }, null, 2);
            }
            case "cf_dns_list_records": {
                const zoneId = args.zone_id;
                const data = await cfApiRequest(`/zones/${zoneId}/dns_records`);
                const records = data.result.map((r) => ({
                    id: r.id,
                    type: r.type,
                    name: r.name,
                    content: r.content,
                    ttl: r.ttl,
                    proxied: r.proxied,
                }));
                return JSON.stringify({ records }, null, 2);
            }
            case "cf_dns_create_record": {
                const { zone_id, type, name, content, ttl = 3600, proxied = false } = args;
                const data = await cfApiRequest(`/zones/${zone_id}/dns_records`, "POST", { type, name, content, ttl, proxied });
                return JSON.stringify({
                    success: true,
                    record: data.result,
                    message: `Created ${type} record for ${name}`
                }, null, 2);
            }
            case "cf_dns_update_record": {
                const { zone_id, record_id, ...updates } = args;
                const data = await cfApiRequest(`/zones/${zone_id}/dns_records/${record_id}`, "PATCH", updates);
                return JSON.stringify({ success: true, record: data.result }, null, 2);
            }
            case "cf_dns_delete_record": {
                const { zone_id, record_id } = args;
                await cfApiRequest(`/zones/${zone_id}/dns_records/${record_id}`, "DELETE");
                return JSON.stringify({
                    success: true,
                    message: `Deleted record ${record_id}`
                }, null, 2);
            }
            case "cf_dns_setup_cloud_run": {
                const { zone_id, subdomain } = args;
                // Cloud Run A records
                const cloudRunIPs = [
                    "216.239.32.21",
                    "216.239.34.21",
                    "216.239.36.21",
                    "216.239.38.21",
                ];
                const results = [];
                for (const ip of cloudRunIPs) {
                    const data = await cfApiRequest(`/zones/${zone_id}/dns_records`, "POST", {
                        type: "A",
                        name: subdomain,
                        content: ip,
                        ttl: 3600,
                        proxied: false,
                    });
                    results.push(data.result);
                }
                return JSON.stringify({
                    success: true,
                    message: `Created 4 A records for ${subdomain}`,
                    records: results,
                    note: "DNS propagation may take 5-30 minutes",
                }, null, 2);
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown Cloudflare DNS tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Cloudflare DNS error: ${errorMessage}`);
    }
}
//# sourceMappingURL=cloudflare-dns-tools.js.map