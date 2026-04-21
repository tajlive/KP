#!/usr/bin/env node
/**
 * Auto-generate missing i18n JSON files by scanning source files
 * and producing Norwegian + English translations.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function extractKeys(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const nsMatch = content.match(/useTranslations\s*\(\s*['"]([^'"]*)['"]\s*\)/);
  const ns = nsMatch ? nsMatch[1] : "";
  const keys = [...content.matchAll(/t\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  return { ns, keys: [...new Set(keys)] };
}

function scanDir(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDir(fullPath, pattern, results);
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf8");
      const matches = [...content.matchAll(/useTranslations\s*\(\s*['"]([^'"]*)['"]\s*\)/g)];
      for (const m of matches) {
        const ns = m[1];
        if (pattern && !ns.startsWith(pattern)) continue;
        const tMatches = [...content.matchAll(/t\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((x) => x[1]);
        const existing = results.find((r) => r.file === fullPath);
        if (existing) {
          for (const k of tMatches) existing.keys.add(k);
        } else {
          results.push({ file: fullPath, ns, keys: new Set(tMatches) });
        }
      }
    }
  }
  return results;
}

// Build nested object from dot-notation keys
function buildNested(keys) {
  const result = {};
  for (const key of keys) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = "";
  }
  return result;
}

// Fill empty strings with auto-translations
function autoTranslate(obj, lang = "no", prefix = "") {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      autoTranslate(v, lang, fullKey);
    } else if (v === "") {
      obj[k] = translateKey(fullKey, lang);
    }
  }
}

function translateKey(key, lang) {
  const dict = TRANSLATIONS[key];
  if (dict) return dict[lang] || dict.en || key;
  // Fallback: humanize key
  const human = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
  return lang === "no" ? human : human;
}

// Translation dictionary
const TRANSLATIONS = {
  // settings.accessibility
  "settings.accessibility.title": { no: "Tilgjengelighet", en: "Accessibility" },
  "settings.accessibility.fontSize": { no: "Tekststørrelse", en: "Font Size" },
  "settings.accessibility.fontSizeNormal": { no: "Normal", en: "Normal" },
  "settings.accessibility.fontSizeLarge": { no: "Stor", en: "Large" },
  "settings.accessibility.fontSizeHint": { no: "Velg tekststørrelse som passer deg best.", en: "Choose the font size that suits you best." },
  "settings.accessibility.highContrast": { no: "Høy kontrast", en: "High Contrast" },
  "settings.accessibility.highContrastDesc": { no: "Øker kontrasten for bedre lesbarhet.", en: "Increases contrast for better readability." },
  "settings.accessibility.highContrastOff": { no: "Skru av høy kontrast", en: "Turn off high contrast" },
  "settings.accessibility.highContrastOn": { no: "Skru på høy kontrast", en: "Turn on high contrast" },
  "settings.accessibility.previewTitle": { no: "Forhåndsvisning", en: "Preview" },
  "settings.accessibility.previewText": { no: "Dette er et eksempel på hvordan teksten vil se ut.", en: "This is an example of how the text will look." },
  "settings.accessibility.previewNote": { no: "Endringene trer i kraft umiddelbart.", en: "Changes take effect immediately." },

  // settings.api
  "settings.api.loadError": { no: "Kunne ikke laste API-nøkler", en: "Could not load API keys" },
  "settings.api.saveSuccess": { no: "API-nøkkel lagret", en: "API key saved" },
  "settings.api.saveError": { no: "Kunne ikke lagre API-nøkkel", en: "Could not save API key" },
  "settings.api.deleteSuccess": { no: "API-nøkkel slettet", en: "API key deleted" },
  "settings.api.deleteError": { no: "Kunne ikke slette API-nøkkel", en: "Could not delete API key" },
  "settings.api.referralCopied": { no: "Referral-link kopiert!", en: "Referral link copied!" },
  "settings.api.labelPlaceholder": { no: "Merkelapp", en: "Label" },
  "settings.api.apiKeyPlaceholder": { no: "API Key", en: "API Key" },
  "settings.api.apiSecretPlaceholder": { no: "API Secret", en: "API Secret" },
  "settings.api.copyKeys": { no: "Kopier nøkler", en: "Copy keys" },

  // settings.billing
  "settings.billing.title": { no: "Abonnement", en: "Subscription" },
  "settings.billing.description": { no: "Administrer ditt abonnement og betalingsmetoder.", en: "Manage your subscription and payment methods." },
  "settings.billing.loading": { no: "Laster abonnementsinfo...", en: "Loading subscription info..." },
  "settings.billing.error": { no: "Kunne ikke laste abonnementsinfo", en: "Could not load subscription info" },
  "settings.billing.cta": { no: "Oppgrader", en: "Upgrade" },
  "settings.billing.sectionTitle": { no: "Din plan", en: "Your plan" },

  // settings.notifications
  "settings.notifications.saved": { no: "Innstillinger lagret", en: "Settings saved" },
  "settings.notifications.saveError": { no: "Kunne ikke lagre innstillinger", en: "Could not save settings" },
  "settings.notifications.updateError": { no: "Kunne ikke oppdatere", en: "Could not update" },
  "settings.notifications.permissionDenied": { no: "Tillatelse nektet. Skru på varslinger i nettleseren.", en: "Permission denied. Enable notifications in your browser." },
  "settings.notifications.vapidMissing": { no: "Push-varslinger er ikke konfigurert.", en: "Push notifications are not configured." },
  "settings.notifications.pushEnabled": { no: "Push-varslinger aktivert", en: "Push notifications enabled" },
  "settings.notifications.pushDisabled": { no: "Push-varslinger deaktivert", en: "Push notifications disabled" },
  "settings.notifications.browserNotSupported": { no: "Nettleseren din støtter ikke push-varslinger.", en: "Your browser does not support push notifications." },
  "settings.notifications.whatToNotify": { no: "Hva vil du varsles om?", en: "What do you want to be notified about?" },
  "settings.notifications.priceAlerts": { no: "Prisvarsler", en: "Price Alerts" },
  "settings.notifications.priceAlertsDesc": { no: "Få beskjed når prisen når et nivå.", en: "Get notified when the price reaches a level." },
  "settings.notifications.tradingSignals": { no: "Trading-signaler", en: "Trading Signals" },
  "settings.notifications.tradingSignalsDesc": { no: "Få beskjed om nye trading-signaler.", en: "Get notified about new trading signals." },
  "settings.notifications.stopLossTakeProfit": { no: "Stop Loss / Take Profit", en: "Stop Loss / Take Profit" },
  "settings.notifications.stopLossTakeProfitDesc": { no: "Få beskjed når SL eller TP nås.", en: "Get notified when SL or TP is hit." },
  "settings.notifications.transactions": { no: "Transaksjoner", en: "Transactions" },
  "settings.notifications.transactionsDesc": { no: "Få beskjed om nye transaksjoner.", en: "Get notified about new transactions." },
  "settings.notifications.portfolioUpdates": { no: "Porteføljeoppdateringer", en: "Portfolio Updates" },
  "settings.notifications.portfolioUpdatesDesc": { no: "Få beskjed om endringer i porteføljen.", en: "Get notified about portfolio changes." },
  "settings.notifications.marketNews": { no: "Markedsnyheter", en: "Market News" },
  "settings.notifications.marketNewsDesc": { no: "Få beskjed om viktige markedsnyheter.", en: "Get notified about important market news." },
  "settings.notifications.competitions": { no: "Konkurranser", en: "Competitions" },
  "settings.notifications.competitionsDesc": { no: "Få beskjed om konkurranser og leaderboard.", en: "Get notified about competitions and leaderboard." },
  "settings.notifications.quietHours": { no: "Stille timer", en: "Quiet Hours" },
  "settings.notifications.quietHoursDesc": { no: "Ingen varslinger i dette tidsrommet.", en: "No notifications during this time." },
  "settings.notifications.from": { no: "Fra", en: "From" },
  "settings.notifications.to": { no: "Til", en: "To" },

  // settings.theme
  "settings.theme.system": { no: "System", en: "System" },
  "settings.theme.systemDesc": { no: "Følg systeminnstillingene", en: "Follow system settings" },
  "settings.theme.light": { no: "Lyst", en: "Light" },
  "settings.theme.lightDesc": { no: "Lyst tema for dagtid", en: "Light theme for daytime" },
  "settings.theme.dark": { no: "Mørkt", en: "Dark" },
  "settings.theme.darkDesc": { no: "Mørkt tema for natt", en: "Dark theme for nighttime" },
  "settings.theme.selected": { no: "Valgt", en: "Selected" },
  "settings.theme.preview": { no: "Forhåndsvisning", en: "Preview" },
  "settings.theme.darkModeActive": { no: "Mørkt tema er aktivt", en: "Dark mode is active" },
  "settings.theme.lightModeActive": { no: "Lyst tema er aktivt", en: "Light mode is active" },

  // settings.profile
  "settings.profile.fullNamePlaceholder": { no: "Fullt navn", en: "Full name" },
  "settings.profile.namePlaceholder": { no: "Navn", en: "Name" },
  "settings.profile.avatarPlaceholder": { no: "Legg til profilbilde", en: "Add profile picture" },
  "settings.profile.avatarUrlPlaceholder": { no: "URL til profilbilde", en: "Profile picture URL" },
};

// Collect all keys per top-level namespace
const files = [
  ...scanDir("src/features/settings", "settings"),
  ...scanDir("src/features/profile", "settings"),
  ...scanDir("src/app/[locale]/(user)/innstillinger", "settings"),
  ...scanDir("src/app/[locale]/(beta)/beta", "beta"),
  ...scanDir("src/app/[locale]/(user)/dashboard/tax-report", "taxReport"),
  ...scanDir("src/features/dashboard", "tradingResults"),
];

const byTopNs = {};
for (const f of files) {
  const topNs = f.ns.split(".")[0];
  if (!byTopNs[topNs]) byTopNs[topNs] = {};
  // Use full namespace as prefix
  const prefix = f.ns;
  for (const k of f.keys) {
    const fullKey = prefix + "." + k;
    byTopNs[topNs][fullKey] = true;
  }
}

// Also scan beta more thoroughly (multiple files use beta namespace)
const betaFiles = [];
function scanAll(dir, nsFilter, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) scanAll(fullPath, nsFilter, results);
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf8");
      const nsMatches = [...content.matchAll(/useTranslations\s*\(\s*['"]([^'"]*)['"]\s*\)/g)];
      for (const m of nsMatches) {
        if (m[1].startsWith(nsFilter)) {
          const tMatches = [...content.matchAll(/t\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((x) => x[1]);
          results.push({ file: fullPath, ns: m[1], keys: [...new Set(tMatches)] });
        }
      }
    }
  }
  return results;
}

// Add beta files
const allBeta = scanAll("src/app/[locale]/(beta)/beta", "beta");
for (const b of allBeta) {
  for (const k of b.keys) {
    const fullKey = b.ns + "." + k;
    byTopNs.beta = byTopNs.beta || {};
    byTopNs.beta[fullKey] = true;
  }
}

// Add taxReport files
const allTax = scanAll("src/app/[locale]/(user)/dashboard/tax-report", "taxReport");
for (const t of allTax) {
  for (const k of t.keys) {
    const fullKey = t.ns + "." + k;
    byTopNs.taxReport = byTopNs.taxReport || {};
    byTopNs.taxReport[fullKey] = true;
  }
}

// Add tradingResults files
const allTradingResults = scanAll("src/features/dashboard", "tradingResults");
for (const tr of allTradingResults) {
  for (const k of tr.keys) {
    const fullKey = tr.ns + "." + k;
    byTopNs.tradingResults = byTopNs.tradingResults || {};
    byTopNs.tradingResults[fullKey] = true;
  }
}

// Filter out wildcard keys (* and /)
for (const ns of Object.keys(byTopNs)) {
  byTopNs[ns] = Object.keys(byTopNs[ns]).filter((k) => !k.endsWith(".*") && !k.endsWith("./"));
}

console.log("Namespaces to generate:", Object.keys(byTopNs));
for (const [ns, keys] of Object.entries(byTopNs)) {
  console.log(`  ${ns}: ${keys.length} keys`);
}

// Generate files
for (const [topNs, keys] of Object.entries(byTopNs)) {
  const nested = buildNested(keys);
  
  // Norwegian
  autoTranslate(JSON.parse(JSON.stringify(nested)), "no");
  const noPath = path.join(ROOT, "messages/no", `${topNs}.json`);
  fs.mkdirSync(path.dirname(noPath), { recursive: true });
  fs.writeFileSync(noPath, JSON.stringify(nested, null, 2) + "\n");
  
  // English
  const enNested = buildNested(keys);
  autoTranslate(enNested, "en");
  const enPath = path.join(ROOT, "messages/en", `${topNs}.json`);
  fs.mkdirSync(path.dirname(enPath), { recursive: true });
  fs.writeFileSync(enPath, JSON.stringify(enNested, null, 2) + "\n");
  
  console.log(`Wrote ${topNs}.json (${keys.length} keys)`);
}

console.log("\nDone!");