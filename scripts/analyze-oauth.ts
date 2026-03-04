#!/usr/bin/env -S deno run --allow-all
/**
 * 🔍 Playwright OAuth Analysis Script
 * Analyzes the OAuth flow to identify the root cause
 */

import { chromium } from "https://esm.sh/playwright@1.41.2";

const LOGIN_URL = "https://www.klarpakke.no/no/login";

console.log("🎭 Starting Playwright OAuth Analysis...\n");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
});

const page = await context.newPage();

// Enable console logging
page.on("console", (msg) => {
  if (msg.text().includes("supabase") || msg.text().includes("auth") || msg.text().includes("error")) {
    console.log(`📋 Console: ${msg.text()}`);
  }
});

try {
  console.log("1️⃣  Navigating to login page...");
  await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
  
  // Wait a bit for JS to load
  await page.waitForTimeout(2000);
  
  console.log("\n2️⃣  Analyzing page content...");
  
  // Check for Supabase URL in page source
  const pageContent = await page.content();
  const hasOldProject = pageContent.includes("oysfdzutvezqhainaxba");
  const hasNewProject = pageContent.includes("vuxbjlykgmzskxbclquf");
  
  console.log(`   Old project (oysfdzutvezqhainaxba): ${hasOldProject ? "❌ FOUND" : "✅ Not found"}`);
  console.log(`   New project (vuxbjlykgmzskxbclquf): ${hasNewProject ? "✅ FOUND" : "❌ Not found"}`);
  
  // Check window objects
  console.log("\n3️⃣  Checking JavaScript environment...");
  const envInfo = await page.evaluate(() => {
    return {
      hasProcessEnv: typeof process !== "undefined" && process.env,
      hasWindowEnv: !!(window as any).__ENV__,
      hasSupabase: !!(window as any).supabase,
      location: window.location.href,
    };
  });
  
  console.log(`   Window ENV detected: ${envInfo.hasWindowEnv ? "✅ Yes" : "❌ No"}`);
  console.log(`   Supabase client detected: ${envInfo.hasSupabase ? "✅ Yes" : "❌ No"}`);
  
  // Try to find the Google login button
  console.log("\n4️⃣  Looking for Google login button...");
  const googleButton = await page.locator("button:has-text('Google'), button:has-text('google'), [data-provider='google']").first();
  
  if (await googleButton.isVisible().catch(() => false)) {
    console.log("   ✅ Google button found");
    
    // Set up request interception
    console.log("\n5️⃣  Clicking Google button and capturing OAuth URL...");
    
    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 10000 }).catch(() => null),
      googleButton.click().catch((e) => {
        console.log(`   ❌ Click failed: ${e.message}`);
        return null;
      }),
    ]);
    
    if (popup) {
      const oauthUrl = popup.url();
      console.log(`\n   🎯 OAuth URL captured: ${oauthUrl.substring(0, 100)}...`);
      
      if (oauthUrl.includes("oysfdzutvezqhainaxba")) {
        console.log("   ❌ CONFIRMED: Using OLD project (oysfdzutvezqhainaxba)");
      } else if (oauthUrl.includes("vuxbjlykgmzskxbclquf")) {
        console.log("   ✅ SUCCESS: Using NEW project (vuxbjlykgmzskxbclquf)");
      }
      
      await popup.close();
    } else {
      console.log("   ⚠️  No popup opened (might be same-window redirect)");
      
      // Check current URL after click
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl.substring(0, 100)}`);
      
      if (currentUrl.includes("oysfdzutvezqhainaxba")) {
        console.log("   ❌ CONFIRMED: Using OLD project");
      } else if (currentUrl.includes("vuxbjlykgmzskxbclquf")) {
        console.log("   ✅ SUCCESS: Using NEW project");
      }
    }
  } else {
    console.log("   ❌ Google button not found");
    
    // List all buttons
    const buttons = await page.locator("button").all();
    console.log(`\n   Available buttons (${buttons.length}):`);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent().catch(() => "no text");
      console.log(`   - ${text?.trim().substring(0, 50)}`);
    }
  }
  
  // Check service worker
  console.log("\n6️⃣  Checking Service Worker...");
  const swState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      hasSW: !!registration,
      scope: registration?.scope,
      state: registration?.active?.state,
    };
  });
  
  console.log(`   Service Worker registered: ${swState.hasSW ? "✅ Yes" : "❌ No"}`);
  if (swState.hasSW) {
    console.log(`   Scope: ${swState.scope}`);
    console.log(`   State: ${swState.state}`);
  }
  
} catch (error) {
  console.error("\n❌ Analysis failed:", error.message);
} finally {
  await browser.close();
  console.log("\n✅ Analysis complete!");
}
