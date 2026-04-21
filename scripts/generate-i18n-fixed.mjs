#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

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

function fillTranslations(obj, lang, prefix = "") {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      fillTranslations(v, lang, fullKey);
    } else if (v === "") {
      obj[k] = translate(fullKey, lang);
    }
  }
}

function translate(key, lang) {
  const d = DICT[key];
  if (d) return d[lang] || d.en || key;
  // Fallback: humanize
  return key.split(".").pop()
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const DICT = {
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

  // beta
  "beta.applicationError": { no: "Det oppstod en feil. Prøv igjen.", en: "An error occurred. Please try again." },
  "beta.loading": { no: "Laster...", en: "Loading..." },
  "beta.success": { no: "Søknad sendt!", en: "Application sent!" },
  "beta.redirecting": { no: "Omdirigerer...", en: "Redirecting..." },
  "beta.applicationPending": { no: "Søknad under behandling", en: "Application pending" },
  "beta.applicationPendingDesc": { no: "Din beta-søknad er under behandling. Vi kontakter deg snart.", en: "Your beta application is pending. We'll contact you soon." },
  "beta.backToDashboard": { no: "Tilbake til dashboard", en: "Back to dashboard" },
  "beta.applyForBeta": { no: "Søk om beta-tilgang", en: "Apply for beta access" },
  "beta.applyForBetaDesc": { no: "Bli en av de første som tester nye funksjoner.", en: "Be among the first to test new features." },
  "beta.tradingExperience": { no: "Trading-erfaring", en: "Trading Experience" },
  "beta.tradingExperiencePlaceholder": { no: "Beskriv din trading-erfaring", en: "Describe your trading experience" },
  "beta.motivation": { no: "Motivasjon", en: "Motivation" },
  "beta.motivationPlaceholder": { no: "Hvorfor vil du bli med i beta?", en: "Why do you want to join the beta?" },
  "beta.riskTolerance": { no: "Risikotoleranse", en: "Risk Tolerance" },
  "beta.riskConservative": { no: "Konservativ", en: "Conservative" },
  "beta.riskModerate": { no: "Moderat", en: "Moderate" },
  "beta.riskAggressive": { no: "Aggressiv", en: "Aggressive" },
  "beta.betaWarning": { no: "Beta-advarsel", en: "Beta Warning" },
  "beta.betaWarningText": { no: "Beta-funksjoner kan være ustabile. Bruk på egen risiko.", en: "Beta features may be unstable. Use at your own risk." },
  "beta.submitting": { no: "Sender...", en: "Submitting..." },
  "beta.submitApplication": { no: "Send søknad", en: "Submit application" },
  "beta.betaDashboard": { no: "Beta-dashboard", en: "Beta Dashboard" },
  "beta.noExchangeConnected": { no: "Ingen børs tilkoblet", en: "No exchange connected" },
  "beta.exchangeConnectDesc": { no: "Koble til en børs for å starte trading.", en: "Connect to an exchange to start trading." },
  "beta.connectBinance": { no: "Koble til Binance", en: "Connect Binance" },
  "beta.liveTrading": { no: "Live Trading", en: "Live Trading" },
  "beta.paperTrading": { no: "Paper Trading", en: "Paper Trading" },
  "beta.aiCopilot": { no: "AI Copilot", en: "AI Copilot" },
  "beta.referralTitle": { no: "Inviter venner", en: "Invite Friends" },
  "beta.tradingLimits": { no: "Trading-grenser", en: "Trading Limits" },
  "beta.maxTradeSize": { no: "Maks trade-størrelse", en: "Max trade size" },
  "beta.statusActive": { no: "Aktiv", en: "Active" },
  "beta.statusIdle": { no: "Inaktiv", en: "Idle" },
  "beta.thankYou": { no: "Takk!", en: "Thank you!" },
  "beta.thankYouDesc": { no: "Din søknad er mottatt.", en: "Your application has been received." },
  "beta.experienceBeginner": { no: "Nybegynner", en: "Beginner" },
  "beta.experienceIntermediate": { no: "Middels", en: "Intermediate" },
  "beta.experienceAdvanced": { no: "Avansert", en: "Advanced" },
  "beta.features": { no: "Funksjoner", en: "Features" },
  "beta.comingSoon": { no: "Kommer snart", en: "Coming soon" },
  "beta.newFeature": { no: "Ny funksjon", en: "New feature" },

  // taxReport
  "taxReport.errorFetching": { no: "Kunne ikke hente skatterapport", en: "Could not fetch tax report" },
  "taxReport.upgradeTitle": { no: "Oppgrader for skatterapport", en: "Upgrade for tax report" },
  "taxReport.pdfOpenInNewWindow": { no: "Åpner PDF i nytt vindu...", en: "Opening PDF in new window..." },
  "taxReport.downloadSuccess": { no: "Skatterapport lastet ned", en: "Tax report downloaded" },
  "taxReport.downloadError": { no: "Kunne ikke laste ned skatterapport", en: "Could not download tax report" },
  "taxReport.upgradeDescription": { no: "Skatterapporter er tilgjengelig for Bachelor-plan og opp.", en: "Tax reports are available for Bachelor plan and above." },
  "taxReport.upgradeCta": { no: "Oppgrader nå", en: "Upgrade now" },
  "taxReport.title": { no: "Skatterapport", en: "Tax Report" },
  "taxReport.description": { no: "Se og last ned din årlige skatterapport.", en: "View and download your annual tax report." },
  "taxReport.selectYear": { no: "Velg år", en: "Select year" },
  "taxReport.pdfHelpText": { no: "PDF-en inneholder all nødvendig informasjon for Skatteetaten.", en: "The PDF contains all necessary information for the tax authorities." },
  "taxReport.totalTrades": { no: "Totalt antall trader", en: "Total trades" },
  "taxReport.realizedProfitLoss": { no: "Realisert gevinst/tap", en: "Realized profit/loss" },
  "taxReport.totalFees": { no: "Totale gebyrer", en: "Total fees" },
  "taxReport.taxObligation": { no: "Skattepliktig beløp", en: "Taxable amount" },
  "taxReport.taxable": { no: "Skattepliktig", en: "Taxable" },
  "taxReport.deductible": { no: "Fradragsberettiget", en: "Deductible" },
  "taxReport.skatteetatenTitle": { no: "Til Skatteetaten", en: "For the Tax Authority" },
  "taxReport.skatteetatenDescription": { no: "Post 3-1-1 (gevinster) og 3-1-2 (tap) i skattemeldingen.", en: "Items 3-1-1 (gains) and 3-1-2 (losses) in the tax return." },
  "taxReport.post3_1_1": { no: "Post 3-1-1", en: "Item 3-1-1" },
  "taxReport.gains": { no: "Gevinster", en: "Gains" },
  "taxReport.post3_1_2": { no: "Post 3-1-2", en: "Item 3-1-2" },
  "taxReport.losses": { no: "Tap", en: "Losses" },
  "taxReport.post3_1_10": { no: "Post 3-1-10", en: "Item 3-1-10" },
  "taxReport.net": { no: "Netto", en: "Net" },
  "taxReport.skatteetatenInfo": { no: "Informasjon til Skatteetaten", en: "Information for the Tax Authority" },
  "taxReport.quarterlyBreakdown": { no: "Kvartalsvis oversikt", en: "Quarterly breakdown" },

  // tradingResults
  "tradingResults.errorLoad": { no: "Kunne ikke laste trading-resultater", en: "Could not load trading results" },
  "tradingResults.mode.paper": { no: "Paper", en: "Paper" },
  "tradingResults.mode.live": { no: "Live", en: "Live" },
  "tradingResults.mode.unknown": { no: "Ukjent", en: "Unknown" },
  "tradingResults.outcome.win": { no: "Vinst", en: "Win" },
  "tradingResults.outcome.loss": { no: "Tap", en: "Loss" },
  "tradingResults.outcome.breakeven": { no: "Break-even", en: "Break-even" },
  "tradingResults.outcome.unknown": { no: "Ukjent", en: "Unknown" },
  "tradingResults.eyebrow": { no: "Resultater", en: "Results" },
  "tradingResults.title": { no: "Trading-resultater", en: "Trading Results" },
  "tradingResults.subtitle": { no: "Din trading-historikk og ytelse", en: "Your trading history and performance" },
  "tradingResults.kpi.trades": { no: "Trader", en: "Trades" },
  "tradingResults.kpi.totalPnl": { no: "Total P&L", en: "Total P&L" },
  "tradingResults.kpi.winRate": { no: "Win Rate", en: "Win Rate" },
  "tradingResults.kpi.bestDay": { no: "Beste dag", en: "Best day" },
  "tradingResults.kpi.totalPnlHint": { no: "Total realisert gevinst/tap", en: "Total realized profit/loss" },
  "tradingResults.intervalHint": { no: "Velg tidsperiode", en: "Select time period" },
  "tradingResults.exportCsv": { no: "Eksporter CSV", en: "Export CSV" },
  "tradingResults.refresh": { no: "Oppdater", en: "Refresh" },
  "tradingResults.openHistory": { no: "Åpne historikk", en: "Open history" },
  "tradingResults.notYetLoaded": { no: "Ingen data lastet ennå", en: "No data loaded yet" },
  "tradingResults.table.time": { no: "Tid", en: "Time" },
  "tradingResults.table.symbol": { no: "Symbol", en: "Symbol" },
  "tradingResults.table.side": { no: "Side", en: "Side" },
  "tradingResults.table.pnl": { no: "P&L", en: "P&L" },
  "tradingResults.table.status": { no: "Status", en: "Status" },
  "tradingResults.filter.all": { no: "Alle", en: "All" },
  "tradingResults.filter.paper": { no: "Paper", en: "Paper" },
  "tradingResults.filter.live": { no: "Live", en: "Live" },
  "tradingResults.empty.title": { no: "Ingen trader ennå", en: "No trades yet" },
  "tradingResults.empty.description": { no: "Start trading for å se resultater her.", en: "Start trading to see results here." },
  "tradingResults.chart.title": { no: "P&L over tid", en: "P&L over time" },
  "tradingResults.chart.noData": { no: "Ingen data å vise", en: "No data to display" },

  // pricing fix
  "pricing.plans.professor.description": { no: "For profesjonelle tradere som vil ha full tilgang og personlig oppfølging.", en: "For professional traders who want full access and personal follow-up." },
};

// Collect keys per top-level namespace
const byTopNs = {};

function collect(dir, filter) {
  const results = scanAll(dir, filter);
  for (const r of results) {
    const topNs = r.ns.split(".")[0];
    if (!byTopNs[topNs]) byTopNs[topNs] = {};
    for (const k of r.keys) {
      if (k === "*" || k === "/" || k === "T" || k === "id" || k === "a" || k.includes("user_id") || k.includes("display_name") || k.includes("full_name")) continue;
      byTopNs[topNs][r.ns + "." + k] = true;
    }
  }
}

collect("src/features/settings", "settings");
collect("src/features/profile", "settings");
collect("src/app/[locale]/(user)/innstillinger", "settings");
collect("src/app/[locale]/(beta)/beta", "beta");
collect("src/app/[locale]/(user)/dashboard/tax-report", "taxReport");
collect("src/features/dashboard", "tradingResults");

// Remove ignored keys
for (const ns of Object.keys(byTopNs)) {
  byTopNs[ns] = Object.keys(byTopNs[ns]);
}

// Also add pricing fix manually
byTopNs.pricing = ["pricing.plans.professor.description"];

console.log("Generating files for namespaces:", Object.keys(byTopNs));
for (const [ns, keys] of Object.entries(byTopNs)) {
  console.log(`  ${ns}: ${keys.length} keys`);
}

for (const [topNs, keys] of Object.entries(byTopNs)) {
  const nested = buildNested(keys);
  const noPath = path.join(ROOT, "messages/no", `${topNs}.json`);
  const enPath = path.join(ROOT, "messages/en", `${topNs}.json`);

  // Merge with existing if file exists
  let existingNo = {};
  let existingEn = {};
  if (fs.existsSync(noPath)) {
    existingNo = JSON.parse(fs.readFileSync(noPath, "utf8"));
  }
  if (fs.existsSync(enPath)) {
    existingEn = JSON.parse(fs.readFileSync(enPath, "utf8"));
  }

  // Deep merge helper
  function deepMerge(target, source) {
    for (const [k, v] of Object.entries(source)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        target[k] = target[k] || {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  const noData = deepMerge(JSON.parse(JSON.stringify(existingNo)), JSON.parse(JSON.stringify(nested)));
  const enData = deepMerge(JSON.parse(JSON.stringify(existingEn)), JSON.parse(JSON.stringify(nested)));

  fillTranslations(noData, "no");
  fillTranslations(enData, "en");

  fs.writeFileSync(noPath, JSON.stringify(noData, null, 2) + "\n");
  fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + "\n");

  console.log(`✅ Wrote ${topNs}.json (${keys.length} new keys merged)`);
}

console.log("\n🎉 All i18n files generated!");
