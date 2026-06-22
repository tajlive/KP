/**
 * OAuth Guard — snapshot and rollback helpers
 */

import * as fs from "fs";
import * as path from "path";
import {
  SNAPSHOT_DIR,
  DESIRED_SITE_URL,
  DESIRED_URI_ALLOW_LIST,
  C,
  parseUriAllowList,
  formatUriAllowList,
  maskSecrets,
} from "./config";
import type { ManagementAuthConfig, SnapshotFile } from "./types";

export function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function writeSnapshot(
  ref: string,
  current: ManagementAuthConfig
): string {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const fileName = `${nowTimestamp()}.json`;
  const filePath = path.join(SNAPSHOT_DIR, fileName);

  const snapshot = {
    timestamp: new Date().toISOString(),
    projectRef: ref,
    desired: {
      site_url: DESIRED_SITE_URL,
      uri_allow_list: DESIRED_URI_ALLOW_LIST,
    },
    rollback: {
      site_url: current.site_url ?? "",
      uri_allow_list: parseUriAllowList(current.uri_allow_list),
    },
    current: maskSecrets(current),
  };

  fs.writeFileSync(
    filePath,
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf-8"
  );
  return filePath;
}

export async function runRollback(
  snapshotPath: string,
  patchAuthConfig: (
    projectRef: string,
    pat: string,
    body: { site_url: string; uri_allow_list: string }
  ) => Promise<{ ok: boolean; error?: string }>,
  accessToken: string | undefined
): Promise<void> {
  if (!fs.existsSync(snapshotPath)) {
    console.error(`${C.red}Snapshot not found:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  let snapshot: SnapshotFile | undefined;
  try {
    snapshot = JSON.parse(
      fs.readFileSync(snapshotPath, "utf-8")
    ) as SnapshotFile;
  } catch {
    console.error(`${C.red}Invalid snapshot file:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  if (!snapshot) {
    console.error(`${C.red}Invalid snapshot file:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  if (!accessToken) {
    console.error(
      `${C.red}SUPABASE_ACCESS_TOKEN is required for rollback${C.rst}`
    );
    process.exit(1);
  }

  const ref = snapshot.projectRef;
  const rollback = snapshot.rollback ?? {};
  const body = {
    site_url: rollback.site_url ?? "",
    uri_allow_list: formatUriAllowList(
      parseUriAllowList(rollback.uri_allow_list)
    ),
  };

  console.log(
    `${C.blu}Rolling back Supabase Auth config for ${ref}...${C.rst}\n`
  );
  const result = await patchAuthConfig(ref, accessToken, body);
  if (!result.ok) {
    console.error(`${C.red}Rollback failed:${C.rst} ${result.error}`);
    process.exit(1);
  }
  console.log(`${C.grn}✓ Rollback applied${C.rst}`);
  process.exit(0);
}
