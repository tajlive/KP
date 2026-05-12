/**
 * API Response Types — Shared between frontend and API
 * Migrert fra: src/app/api/dashboard/metrics/route.ts
 * 
 * NOTE: Types previously exported from API routes are now centralized here
 * to support Cloudflare Pages migration (API routes run as Workers/Edge Functions).
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
