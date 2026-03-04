/**
 * Cloud Run MCP Tools for Klarpakke
 *
 * Manage Google Cloud Run deployments and services
 */
import { execSync } from "child_process";
const REPO_ROOT = "/Users/taj/klarpakke";
const PROJECT_ID = "klarpakke-universitet";
const REGION = "us-central1";
const SERVICE_NAME = "klarpakke";
// Helper for gcloud execution
function executeGCloud(command, cwd = REPO_ROOT) {
    try {
        return execSync(`gcloud ${command}`, {
            encoding: "utf-8",
            cwd,
            env: { ...process.env, CLOUDSDK_CORE_PROJECT: PROJECT_ID }
        });
    }
    catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
export const cloudRunTools = [
    {
        name: "cloudrun_status",
        description: "Get Cloud Run service status and URL",
        input_schema: {
            type: "object",
            properties: {
                service: { type: "string", description: "Service name (default: klarpakke)", default: "klarpakke" },
                region: { type: "string", description: "Region (default: us-central1)", default: "us-central1" },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_deploy",
        description: "Deploy to Cloud Run using cloudbuild.yaml",
        input_schema: {
            type: "object",
            properties: {
                tag: { type: "string", description: "Custom tag (default: timestamp)" },
                async: { type: "boolean", description: "Deploy async (don't wait)", default: false },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_logs",
        description: "View Cloud Run service logs",
        input_schema: {
            type: "object",
            properties: {
                service: { type: "string", default: "klarpakke" },
                limit: { type: "number", default: 50 },
                follow: { type: "boolean", default: false },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_set_env",
        description: "Set environment variable in Cloud Run service",
        input_schema: {
            type: "object",
            properties: {
                key: { type: "string", description: "Environment variable name" },
                value: { type: "string", description: "Environment variable value" },
            },
            required: ["key", "value"],
        },
    },
    {
        name: "cloudrun_get_env",
        description: "Get all environment variables from Cloud Run service",
        input_schema: {
            type: "object",
            properties: {
                service: { type: "string", default: "klarpakke" },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_update_iam",
        description: "Update IAM policy to allow unauthenticated access",
        input_schema: {
            type: "object",
            properties: {
                service: { type: "string", default: "klarpakke" },
                allow_unauthenticated: { type: "boolean", default: true },
            },
            required: [],
        },
    },
    {
        name: "gcloud_builds_list",
        description: "List recent Cloud Build builds",
        input_schema: {
            type: "object",
            properties: {
                limit: { type: "number", default: 10 },
            },
            required: [],
        },
    },
    {
        name: "gcloud_build_logs",
        description: "View logs from a Cloud Build",
        input_schema: {
            type: "object",
            properties: {
                build_id: { type: "string", description: "Build ID (default: latest)" },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_test_url",
        description: "Test Cloud Run URL and verify it's responding",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to test (default: service URL)" },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_list_revisions",
        description: "List all revisions of the Cloud Run service",
        input_schema: {
            type: "object",
            properties: {
                service: { type: "string", default: "klarpakke" },
            },
            required: [],
        },
    },
    {
        name: "cloudrun_rollback",
        description: "Rollback to a previous revision",
        input_schema: {
            type: "object",
            properties: {
                revision: { type: "string", description: "Revision name to rollback to" },
            },
            required: ["revision"],
        },
    },
    {
        name: "cloudrun_traffic_split",
        description: "Split traffic between revisions",
        input_schema: {
            type: "object",
            properties: {
                revisions: {
                    type: "string",
                    description: "Comma-separated list of revision=percent (e.g., 'rev1=50,rev2=50')"
                },
            },
            required: ["revisions"],
        },
    },
];
export async function executeCloudRunTool(name, args) {
    switch (name) {
        case "cloudrun_status": {
            const service = args?.service || SERVICE_NAME;
            const region = args?.region || REGION;
            const result = executeGCloud(`run services describe ${service} --region=${region} --format='table(status.url, status.conditions[0].status, metadata.generation)'`);
            return JSON.stringify({
                service,
                region,
                output: result,
                console_url: `https://console.cloud.google.com/run/detail/${region}/${service}?project=${PROJECT_ID}`,
            }, null, 2);
        }
        case "cloudrun_deploy": {
            const tag = args?.tag || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const async = args?.async || false;
            // Get Supabase env vars
            let supabaseUrl = "";
            let supabaseKey = "";
            try {
                const fs = await import("fs");
                const envContent = fs.readFileSync(`${REPO_ROOT}/.env.local`, "utf-8");
                supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim() || "";
                supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || "";
            }
            catch (e) {
                // Ignore
            }
            const cmd = `builds submit --config=cloudbuild.yaml --substitutions=_TAG="${tag}",_NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl}",_NEXT_PUBLIC_SUPABASE_ANON_KEY="${supabaseKey}"${async ? ' --async' : ''}`;
            const result = executeGCloud(cmd);
            return JSON.stringify({
                tag,
                async,
                output: result,
                note: async ? "Build started async. Check status with gcloud_builds_list" : "Build completed",
            }, null, 2);
        }
        case "cloudrun_logs": {
            const service = args?.service || SERVICE_NAME;
            const limit = args?.limit || 50;
            const follow = args?.follow || false;
            const cmd = `logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${service}" --limit=${limit} --format='table(timestamp, severity, textPayload)'`;
            if (follow) {
                return JSON.stringify({
                    message: "To follow logs in real-time, run:",
                    command: `gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=${service}"`,
                }, null, 2);
            }
            const result = executeGCloud(cmd);
            return JSON.stringify({
                service,
                limit,
                logs: result,
            }, null, 2);
        }
        case "cloudrun_set_env": {
            const { key, value } = args;
            const result = executeGCloud(`run services update ${SERVICE_NAME} --region=${REGION} --update-env-vars="${key}=${value}"`);
            return JSON.stringify({
                success: true,
                key,
                value: value.substring(0, 10) + "...", // Don't log full value for security
                output: result,
            }, null, 2);
        }
        case "cloudrun_get_env": {
            const service = args?.service || SERVICE_NAME;
            const result = executeGCloud(`run services describe ${service} --region=${REGION} --format='value(spec.template.spec.containers[0].env)'`);
            return JSON.stringify({
                service,
                env: result,
            }, null, 2);
        }
        case "cloudrun_update_iam": {
            const service = args?.service || SERVICE_NAME;
            const allow = args?.allow_unauthenticated !== false;
            if (allow) {
                const result = executeGCloud(`run services add-iam-policy-binding ${service} --region=${REGION} --member="allUsers" --role="roles/run.invoker"`);
                return JSON.stringify({
                    success: true,
                    action: "added",
                    service,
                    output: result,
                }, null, 2);
            }
            else {
                return JSON.stringify({
                    message: "To remove public access, use the Cloud Console",
                    url: `https://console.cloud.google.com/run/detail/${REGION}/${service}/security?project=${PROJECT_ID}`,
                }, null, 2);
            }
        }
        case "gcloud_builds_list": {
            const limit = args?.limit || 10;
            const result = executeGCloud(`builds list --limit=${limit} --format='table(id, status, createTime, substitutions._TAG)'`);
            return JSON.stringify({
                limit,
                builds: result,
            }, null, 2);
        }
        case "gcloud_build_logs": {
            const buildId = args?.build_id;
            if (!buildId) {
                // Get latest build
                const latest = executeGCloud("builds list --limit=1 --format='value(id)'").trim();
                const result = executeGCloud(`builds log ${latest}`);
                return JSON.stringify({
                    build_id: latest,
                    logs: result,
                }, null, 2);
            }
            const result = executeGCloud(`builds log ${buildId}`);
            return JSON.stringify({
                build_id: buildId,
                logs: result,
            }, null, 2);
        }
        case "cloudrun_test_url": {
            const url = args?.url;
            if (!url) {
                // Get service URL
                const serviceUrl = executeGCloud(`run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)'`).trim();
                // Test the URL
                try {
                    const httpResult = execSync(`curl -s -o /dev/null -w "%{http_code}" -L "${serviceUrl}"`, { encoding: "utf-8" });
                    return JSON.stringify({
                        url: serviceUrl,
                        status_code: httpResult.trim(),
                        healthy: httpResult.trim() === "200" || httpResult.trim() === "307",
                    }, null, 2);
                }
                catch (e) {
                    return JSON.stringify({
                        url: serviceUrl,
                        error: String(e),
                    }, null, 2);
                }
            }
            try {
                const httpResult = execSync(`curl -s -o /dev/null -w "%{http_code}" -L "${url}"`, { encoding: "utf-8" });
                return JSON.stringify({
                    url,
                    status_code: httpResult.trim(),
                    healthy: httpResult.trim() === "200" || httpResult.trim() === "307",
                }, null, 2);
            }
            catch (e) {
                return JSON.stringify({
                    url,
                    error: String(e),
                }, null, 2);
            }
        }
        case "cloudrun_list_revisions": {
            const service = args?.service || SERVICE_NAME;
            const result = executeGCloud(`run revisions list --service=${service} --region=${REGION} --format='table(metadata.name, metadata.creationTimestamp, status.conditions[0].status)'`);
            return JSON.stringify({
                service,
                revisions: result,
            }, null, 2);
        }
        case "cloudrun_rollback": {
            const { revision } = args;
            const result = executeGCloud(`run services update-traffic ${SERVICE_NAME} --region=${REGION} --to-revisions=${revision}=100`);
            return JSON.stringify({
                success: true,
                revision,
                output: result,
            }, null, 2);
        }
        case "cloudrun_traffic_split": {
            const { revisions } = args;
            const result = executeGCloud(`run services update-traffic ${SERVICE_NAME} --region=${REGION} --to-revisions=${revisions}`);
            return JSON.stringify({
                success: true,
                revisions,
                output: result,
            }, null, 2);
        }
        default:
            return JSON.stringify({ error: `Unknown Cloud Run tool: ${name}` });
    }
}
//# sourceMappingURL=cloud-run-tools.js.map