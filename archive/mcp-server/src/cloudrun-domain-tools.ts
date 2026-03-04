import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "klarpakke";
const REGION = process.env.GOOGLE_CLOUD_REGION || "us-central1";
const SERVICE_NAME = process.env.CLOUD_RUN_SERVICE || "klarpakke";

export const cloudrunDomainTools = [
  {
    name: "cloudrun_list_domain_mappings",
    description: "List all domain mappings for Cloud Run service",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudrun_create_domain_mapping",
    description: "Map a custom domain to Cloud Run service",
    input_schema: {
      type: "object" as const,
      properties: {
        domain: {
          type: "string",
          description: "Domain name (e.g., www.klarpakke.no)",
        },
        service: {
          type: "string",
          description: "Cloud Run service name (default: klarpakke)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "cloudrun_delete_domain_mapping",
    description: "Remove a domain mapping from Cloud Run",
    input_schema: {
      type: "object" as const,
      properties: {
        domain: {
          type: "string",
          description: "Domain name to remove",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "cloudrun_get_domain_mapping_status",
    description: "Check status of domain mapping and certificate",
    input_schema: {
      type: "object" as const,
      properties: {
        domain: {
          type: "string",
          description: "Domain name to check",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "cloudrun_configure_ssl",
    description: "Configure managed SSL certificate for domain",
    input_schema: {
      type: "object" as const,
      properties: {
        domain: {
          type: "string",
          description: "Domain for SSL certificate",
        },
      },
      required: ["domain"],
    },
  },
];

export async function executeCloudrunDomainTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "cloudrun_list_domain_mappings": {
        try {
          const output = execSync(
            `gcloud run domain-mappings list --platform managed --region ${REGION} --project ${PROJECT_ID} --format json`,
            { encoding: "utf-8", timeout: 30000 }
          );
          const mappings = JSON.parse(output);
          return JSON.stringify({ 
            mappings: mappings.map((m: any) => ({
              domain: m.metadata.name,
              service: m.spec.routeName,
              status: m.status.conditions?.find((c: any) => c.type === "Ready")?.status || "Unknown",
            })),
          }, null, 2);
        } catch (e) {
          return JSON.stringify({ 
            mappings: [], 
            note: "No domain mappings found or gcloud not authenticated" 
          }, null, 2);
        }
      }

      case "cloudrun_create_domain_mapping": {
        const domain = args.domain as string;
        const service = (args.service as string) || SERVICE_NAME;
        
        try {
          const output = execSync(
            `gcloud run domain-mappings create --service ${service} --domain ${domain} --region ${REGION} --project ${PROJECT_ID} --format json`,
            { encoding: "utf-8", timeout: 60000 }
          );
          return JSON.stringify({
            success: true,
            domain,
            service,
            message: `Domain mapping created for ${domain}`,
            note: "Update DNS records to point to Cloud Run IPs",
            cloud_run_ips: [
              "216.239.32.21",
              "216.239.34.21",
              "216.239.36.21",
              "216.239.38.21",
            ],
          }, null, 2);
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          return JSON.stringify({
            success: false,
            error: errorMsg,
            fix: `Run manually: gcloud run domain-mappings create --service ${service} --domain ${domain} --region ${REGION}`,
          }, null, 2);
        }
      }

      case "cloudrun_delete_domain_mapping": {
        const domain = args.domain as string;
        
        try {
          const output = execSync(
            `gcloud run domain-mappings delete ${domain} --region ${REGION} --project ${PROJECT_ID} --quiet`,
            { encoding: "utf-8", timeout: 30000 }
          );
          return JSON.stringify({
            success: true,
            domain,
            message: `Domain mapping for ${domain} deleted`,
          }, null, 2);
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          return JSON.stringify({
            success: false,
            error: errorMsg,
          }, null, 2);
        }
      }

      case "cloudrun_get_domain_mapping_status": {
        const domain = args.domain as string;
        
        try {
          const output = execSync(
            `gcloud run domain-mappings describe ${domain} --region ${REGION} --project ${PROJECT_ID} --format json`,
            { encoding: "utf-8", timeout: 30000 }
          );
          const data = JSON.parse(output);
          
          const readyCondition = data.status?.conditions?.find((c: any) => c.type === "Ready");
          const certCondition = data.status?.conditions?.find((c: any) => c.type === "CertificateReady");
          
          return JSON.stringify({
            domain,
            service: data.spec?.routeName,
            status: readyCondition?.status || "Unknown",
            certificate_status: certCondition?.status || "Unknown",
            message: readyCondition?.message || "No status message",
            record_type: data.status?.resourceRecords?.[0]?.type || "A",
            record_values: data.status?.resourceRecords?.map((r: any) => r.rrdata) || [],
          }, null, 2);
        } catch (e) {
          return JSON.stringify({
            domain,
            status: "Not found",
            message: "Domain mapping does not exist",
          }, null, 2);
        }
      }

      case "cloudrun_configure_ssl": {
        const domain = args.domain as string;
        
        // Cloud Run automatically manages SSL certificates
        return JSON.stringify({
          domain,
          ssl_status: "managed",
          message: "Cloud Run automatically provisions and manages SSL certificates",
          note: "Certificate will be provisioned after DNS is configured",
          steps: [
            "1. Ensure domain is mapped to Cloud Run service",
            "2. Configure DNS records to point to Cloud Run IPs",
            "3. SSL certificate will be auto-provisioned (can take 15-60 min)",
          ],
        }, null, 2);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown Cloud Run domain tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Cloud Run domain error: ${errorMessage}`);
  }
}
