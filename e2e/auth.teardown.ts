import { test as teardown } from "@playwright/test";
import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Auth teardown — kjører etter critical-prosjekter (Playwright teardown-kjede).
 * Sletter ikke .auth/user.json som standard: midt i multi-fase-kjøringer ga
 * relativ storageState-path tidvis ENOENT; behold fil for repro og neste kjøring.
 * Valgfritt: E2E_DELETE_AUTH_STORAGE=1 for å slette etter suite.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

teardown("cleanup auth state", async () => {
  const authFile = join(__dirname, "../.auth/user.json");
  const exists = fs.existsSync(authFile);
  const willDelete = process.env.E2E_DELETE_AUTH_STORAGE === "1";

  if (exists && willDelete) {
    fs.unlinkSync(authFile);
    console.log("🧹 Auth state cleaned up (E2E_DELETE_AUTH_STORAGE=1)");
  } else if (exists) {
    console.log(
      "🧹 Auth teardown: beholder .auth/user.json (sett E2E_DELETE_AUTH_STORAGE=1 for å slette)",
    );
  }

  // Cleanup test results older than 7 days
  const resultsDir = join(__dirname, "../test-results");
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = join(resultsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > sevenDays) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }
  }
});
