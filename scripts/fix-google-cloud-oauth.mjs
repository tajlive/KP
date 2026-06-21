#!/usr/bin/env node
/**
 * Automatisk oppdatering av Google Cloud OAuth redirect URIs.
 *
 * Bruker Playwright med brukerens eksisterende Chrome-profil for å unngå
 * ny innlogging hvis Chrome allerede er logget inn i Google Cloud Console.
 */

import { chromium } from "@playwright/test";
import { existsSync, cpSync, mkdtempSync, rmSync, readdirSync } from "fs";
import { join, basename } from "path";
import { homedir, tmpdir } from "os";

const PROJECT_ID = "klarpakke-universitet";
const CLIENT_ID =
  "732971230419-ji429k3hp0nv80c96d2a1685lsuirvj5.apps.googleusercontent.com";
const DESIRED_REDIRECT_URIS = [
  "https://www.klarpakke.no/no/callback",
  "https://www.klarpakke.no/en/callback",
  "https://www.klarpakke.no/th/callback",
  "https://www.klarpakke.no/zh/callback",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function detectChromeProfile() {
  const candidates = [
    join(homedir(), "Library/Application Support/Google/Chrome"),
    join(homedir(), "Library/Application Support/Google/Chrome Canary"),
    join(homedir(), ".config/google-chrome"),
    join(homedir(), ".config/chromium"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const SKIP_FILES = new Set([
  "SingletonLock",
  "SingletonCookie",
  "SingletonSocket",
  "lockfile",
]);

function copyChromeProfile() {
  const source = detectChromeProfile();
  if (!source) return null;
  const tmp = mkdtempSync(join(tmpdir(), "chrome-profile-"));
  console.log(`   Kopierer Chrome-profil til temp-mappe: ${tmp}`);
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (SKIP_FILES.has(entry.name)) continue;
    const srcPath = join(source, entry.name);
    const destPath = join(tmp, entry.name);
    try {
      cpSync(srcPath, destPath, { recursive: true });
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log(`      Hoppet over manglende fil: ${entry.name}`);
      } else {
        throw err;
      }
    }
  }
  return tmp;
}

async function main() {
  console.log("🎭 Starter Playwright for Google Cloud Console-automasjon...");

  const userDataDir = copyChromeProfile();
  if (userDataDir) {
    console.log(`   Bruker temp Chrome-profil: ${userDataDir}`);
  } else {
    console.log("   Ingen eksisterende Chrome-profil funnet — starter tom browser.");
  }

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome",
    args: ["--start-maximized", "--no-first-run"],
  });

  const page = browser.pages()[0] || (await browser.newPage());

  try {
    const url = `https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}`;
    console.log(`   Navigerer til: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Vent på at siden laster
    await sleep(3000);

    // Sjekk om vi er på login-siden
    if (page.url().includes("accounts.google.com")) {
      console.log("   Venter på Google-login...");
      await page.waitForNavigation({
        waitUntil: "networkidle",
        timeout: 120000,
      });
      await sleep(3000);
    }

    // Sjekk om vi er på consent-siden
    if (page.url().includes("oauth2/consent")) {
      console.log("   Godkjenner Google Cloud Console-tilgang...");
      const continueBtn = page.locator('button:has-text("Continue")');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForNavigation({ waitUntil: "networkidle", timeout: 60000 });
        await sleep(3000);
      }
    }

    // Finn OAuth client ved å søke etter Client ID
    console.log("   Leter etter OAuth 2.0 Client ID...");
    const clientLink = page.locator(`text=${CLIENT_ID}`).first();
    await clientLink.waitFor({ timeout: 30000 });
    await clientLink.click();
    await sleep(2000);

    // Klikk Edit
    console.log("   Åpner redigering...");
    const editBtn = page.locator('button:has-text("EDIT")').first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await sleep(2000);
    }

    // Fjern eksisterende redirect URIs og legg til nye
    console.log("   Oppdaterer Authorized redirect URIs...");

    // Finn alle redirect URI input-felter
    const inputs = page.locator('input[placeholder*="URI"], input[aria-label*="redirect"]').all();
    for (const input of await inputs) {
      await input.fill("");
    }

    // Finn "ADD URI" knapp
    const addUriBtn = page.locator('button:has-text("ADD URI")').first();

    for (const uri of DESIRED_REDIRECT_URIS) {
      await addUriBtn.click();
      await sleep(500);
      const allInputs = await page.locator('input[placeholder*="URI"]').all();
      const lastEmpty = allInputs.reverse().find(async (i) => (await i.inputValue()) === "");
      if (lastEmpty) {
        await lastEmpty.fill(uri);
      }
    }

    // Lagre
    console.log("   Lagrer...");
    const saveBtn = page.locator('button:has-text("SAVE")').first();
    await saveBtn.click();

    // Vent på lagring
    await page.waitForSelector('text=Client ID updated', { timeout: 30000 }).catch(() => {});
    await sleep(3000);

    console.log("✅ Google Cloud OAuth redirect URIs oppdatert.");
  } catch (error) {
    console.error("❌ Feil under automasjon:", error.message);
    console.log("   Tar screenshot...");
    await page.screenshot({ path: "/tmp/gcloud-oauth-error.png" });
    console.log("   Screenshot lagret til /tmp/gcloud-oauth-error.png");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
