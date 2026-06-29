/**
 * API Response Types — Shared between frontend and API
 * Migrert fra: src/app/api/dashboard/metrics/route.ts
 * 
 * NOTE: Types previously exported from API routes are now centralized here
 * to support the Cloudflare Workers/OpenNext runtime.
 */

import type { DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";

export interface DashboardMetricsSuccessResponse {
  ok: true;
  data: DashboardMetrics;
}

export interface DashboardMetricsErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}
