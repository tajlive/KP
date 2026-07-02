import { getConfig } from "./config.js";
import {
  initiateDeviceFlow,
  pollAccessToken,
  saveTokens,
  ensureTokenDirectory,
} from "./auth.js";
import type {
  KimiDeviceSession,
  KimiOAuthTokens,
  KimiPollStatus,
} from "./auth.js";

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

function isTokens(
  result: KimiOAuthTokens | KimiPollStatus
): result is KimiOAuthTokens {
  return "accessToken" in result;
}

async function runLogin(): Promise<void> {
  const config = getConfig();

  if (!config.kimi.clientId) {
    console.error("KIMI_OAUTH_CLIENT_ID is not configured.");
    console.error("Set it in your environment or .env.local file.");
    process.exit(1);
  }

  await ensureTokenDirectory(config);

  console.log("Starting Kimi OAuth device flow...\n");
  let session: KimiDeviceSession;
  try {
    session = await initiateDeviceFlow(config);
  } catch (error) {
    console.error(
      "Failed to initiate device flow:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  console.log("Open this URL in your browser and confirm the code:");
  console.log(`  ${session.verificationUri}`);
  console.log();
  console.log(`User code: ${session.userCode}`);
  console.log();
  console.log(`Waiting for authorization (expires in ${session.expiresIn}s)...`);

  let intervalMs = session.interval * 1000;
  const expiresAt = session.expiresAt;

  while (Date.now() < expiresAt) {
    await sleep(intervalMs);

    let result: KimiOAuthTokens | KimiPollStatus;
    try {
      result = await pollAccessToken(config, session.deviceCode);
    } catch (error) {
      console.error(
        "\nError polling for token:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }

    if (isTokens(result)) {
      await saveTokens(config.tokenFile, result);
      console.log("\n✓ Kimi OAuth login successful.");
      console.log(`  Access token expires at: ${new Date(result.expiresAt).toISOString()}`);
      console.log(`  Token stored in: ${config.tokenFile}`);
      console.log("\nStart the bridge with:");
      console.log("  npm run kimi-oauth:bridge");
      return;
    }

    if (result.status === "denied") {
      console.error("\nLogin denied by user.");
      process.exit(1);
    }

    if (result.status === "expired") {
      console.error("\nDevice code expired. Please run login again.");
      process.exit(1);
    }

    if (result.status === "slow_down") {
      intervalMs += 5000;
      console.log("  (slow_down received; increasing poll interval)");
    }

    // authorization_pending and other statuses keep polling.
  }

  console.error("\nDevice code expired before authorization.");
  process.exit(1);
}

runLogin().catch((error) => {
  console.error(error);
  process.exit(1);
});
