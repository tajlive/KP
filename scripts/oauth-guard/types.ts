/**
 * OAuth Guard — shared types
 */

export type IssueSeverity = "error" | "warning" | "info";

export interface Issue {
  file: string;
  line: number;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
  fix?: { old: string; new: string };
}

export interface ManagementAuthConfig {
  site_url?: string;
  uri_allow_list?: string | string[];
  [key: string]: unknown;
}

export interface RemoteDiff {
  siteUrlChanged: boolean;
  added: string[];
  removed: string[];
}

export interface RemoteResult {
  reachable: boolean;
  projectRef?: string;
  current?: ManagementAuthConfig;
  desired?: { site_url: string; uri_allow_list: string[] };
  diff?: RemoteDiff;
  matchesDesired?: boolean;
  issues: Issue[];
  snapshotPath?: string;
  applyError?: string;
  verificationOk?: boolean;
}

export interface GuardResult {
  ok: boolean;
  issues: Issue[];
  remote?: RemoteResult;
  copyPaste?: {
    supabaseUrls: string;
    providerConsole: string;
  };
}

export interface SnapshotFile {
  projectRef: string;
  rollback?: { site_url?: string; uri_allow_list?: string | string[] };
}
