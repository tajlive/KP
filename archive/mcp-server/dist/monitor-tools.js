import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "klarpakke";
const REGION = process.env.GOOGLE_CLOUD_REGION || "us-central1";
const SERVICE_NAME = process.env.CLOUD_RUN_SERVICE || "klarpakke";
export const monitorTools = [
    {
        name: "monitor_uptime",
        description: "Check uptime and health of deployed services",
        input_schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to check (default: Cloud Run URL)",
                },
            },
            required: [],
        },
    },
    {
        name: "monitor_cloudrun_logs",
        description: "Get recent Cloud Run logs",
        input_schema: {
            type: "object",
            properties: {
                lines: {
                    type: "number",
                    description: "Number of log lines (default: 50)",
                },
                service: {
                    type: "string",
                    description: "Service name (default: klarpakke)",
                },
            },
            required: [],
        },
    },
    {
        name: "monitor_errors",
        description: "Check for recent errors in logs",
        input_schema: {
            type: "object",
            properties: {
                service: {
                    type: "string",
                    description: "Service name",
                },
                hours: {
                    type: "number",
                    description: "Hours to look back (default: 1)",
                },
            },
            required: [],
        },
    },
    {
        name: "monitor_performance",
        description: "Get performance metrics for Cloud Run service",
        input_schema: {
            type: "object",
            properties: {
                service: {
                    type: "string",
                    description: "Service name (default: klarpakke)",
                },
            },
            required: [],
        },
    },
    {
        name: "monitor_health_check",
        description: "Run comprehensive health check on all services",
        input_schema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
];
export async function executeMonitorTool(name, args) {
    try {
        switch (name) {
            case "monitor_uptime": {
                const url = args.url || `https://${SERVICE_NAME}-${PROJECT_ID}-${REGION}.a.run.app`;
                try {
                    const startTime = Date.now();
                    const response = await fetch(url, { method: "HEAD" });
                    const responseTime = Date.now() - startTime;
                    return JSON.stringify({
                        url,
                        status: response.status,
                        status_text: response.statusText,
                        response_time_ms: responseTime,
                        healthy: response.status >= 200 && response.status < 400,
                        timestamp: new Date().toISOString(),
                    }, null, 2);
                }
                catch (e) {
                    return JSON.stringify({
                        url,
                        status: "error",
                        healthy: false,
                        error: e instanceof Error ? e.message : String(e),
                        timestamp: new Date().toISOString(),
                    }, null, 2);
                }
            }
            case "monitor_cloudrun_logs": {
                const lines = args.lines || 50;
                const service = args.service || SERVICE_NAME;
                try {
                    const output = execSync(`gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${service}" --limit ${lines} --format json`, { encoding: "utf-8", timeout: 30000 });
                    const logs = JSON.parse(output);
                    const formatted = logs.map((log) => ({
                        timestamp: log.timestamp,
                        severity: log.severity,
                        message: log.jsonPayload?.message || log.textPayload || "No message",
                    }));
                    return JSON.stringify({
                        service,
                        count: formatted.length,
                        logs: formatted.slice(0, 20), // Limit output
                    }, null, 2);
                }
                catch (e) {
                    return JSON.stringify({
                        service,
                        error: "Failed to fetch logs",
                        fix: "Check gcloud authentication",
                    }, null, 2);
                }
            }
            case "monitor_errors": {
                const service = args.service || SERVICE_NAME;
                const hours = args.hours || 1;
                try {
                    const output = execSync(`gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${service} AND severity>=ERROR" --limit 20 --freshness ${hours}h --format json`, { encoding: "utf-8", timeout: 30000 });
                    const logs = JSON.parse(output);
                    return JSON.stringify({
                        service,
                        hours,
                        error_count: logs.length,
                        errors: logs.map((log) => ({
                            timestamp: log.timestamp,
                            message: log.jsonPayload?.message || log.textPayload,
                            severity: log.severity,
                        })),
                    }, null, 2);
                }
                catch (e) {
                    return JSON.stringify({
                        service,
                        hours,
                        error_count: 0,
                        note: "No errors found or unable to fetch logs",
                    }, null, 2);
                }
            }
            case "monitor_performance": {
                const service = args.service || SERVICE_NAME;
                try {
                    // Get service info
                    const serviceOutput = execSync(`gcloud run services describe ${service} --region ${REGION} --project ${PROJECT_ID} --format json`, { encoding: "utf-8", timeout: 30000 });
                    const serviceData = JSON.parse(serviceOutput);
                    return JSON.stringify({
                        service,
                        url: serviceData.status?.url,
                        concurrency: serviceData.spec?.template?.spec?.containerConcurrency || "default",
                        timeout: serviceData.spec?.template?.spec?.timeoutSeconds,
                        memory: serviceData.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory,
                        cpu: serviceData.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu,
                        min_instances: serviceData.spec?.template?.metadata?.annotations?.["autoscaling.knative.dev/minScale"],
                        max_instances: serviceData.spec?.template?.metadata?.annotations?.["autoscaling.knative.dev/maxScale"],
                    }, null, 2);
                }
                catch (e) {
                    return JSON.stringify({
                        service,
                        error: "Failed to get performance metrics",
                    }, null, 2);
                }
            }
            case "monitor_health_check": {
                const checks = {
                    timestamp: new Date().toISOString(),
                    services: {},
                    overall_healthy: true,
                };
                // Check Cloud Run
                try {
                    const cloudRunUrl = `https://${SERVICE_NAME}-${PROJECT_ID}-${REGION}.a.run.app`;
                    const response = await fetch(cloudRunUrl, { method: "HEAD" });
                    checks.services.cloud_run = {
                        status: response.status,
                        healthy: response.status >= 200 && response.status < 400,
                    };
                    if (!checks.services.cloud_run.healthy) {
                        checks.overall_healthy = false;
                    }
                }
                catch (e) {
                    checks.services.cloud_run = {
                        status: "error",
                        healthy: false,
                    };
                    checks.overall_healthy = false;
                }
                // Check Supabase
                try {
                    execSync("supabase status", {
                        cwd: PROJECT_ID,
                        encoding: "utf-8",
                        timeout: 10000
                    });
                    checks.services.supabase = { healthy: true };
                }
                catch (e) {
                    checks.services.supabase = {
                        healthy: false,
                        note: "CLI not linked or project not found"
                    };
                }
                // Check Git
                try {
                    const gitStatus = execSync("git status --porcelain", {
                        cwd: PROJECT_ID,
                        encoding: "utf-8"
                    });
                    checks.services.git = {
                        healthy: true,
                        clean: gitStatus.trim() === "",
                        uncommitted_changes: gitStatus.split("\n").filter(l => l).length,
                    };
                }
                catch (e) {
                    checks.services.git = { healthy: false };
                }
                return JSON.stringify(checks, null, 2);
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown monitor tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Monitor error: ${errorMessage}`);
    }
}
//# sourceMappingURL=monitor-tools.js.map