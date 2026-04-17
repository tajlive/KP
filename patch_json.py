import json

def patch_file(filepath, copy_trading_content):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    data['copyTrading'] = copy_trading_content
    
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

no_copy = {
  "dashboard": {
    "title": "Copy Trading",
    "subtitleActive": "{count} aktive tradere",
    "refresh": "Oppdater data",
    "totalPnlLabel": "Total Copy P&L",
    "mineTitle": "Mine traders",
    "paused": "Pauset",
    "sizingProportional": "Proporsjonal",
    "sizingFixed": "Fast",
    "recentCopies": "Siste kopierte trades",
    "emptyTitle": "Ingen traders ennå",
    "emptyBody": "Utforsk kuraterte paper-ledere og start trygt — eller vent til community vokser.",
    "discoverCta": "Oppdag ledere",
    "settingsAria": "Innstillinger for {name}",
    "maxAlloc": "Maks {amount}",
    "latency": "{ms} ms forsinkelse",
    "pnlPercentUnavailable": "–",
    "fetchErrorTitle": "Kunne ikke hente dine traders",
    "fetchErrorHint": "Prøv «Oppdater data». Er du innlogget? Hvis du nettopp startet kopiering, last siden på nytt."
  },
  "discover": {
    "title": "Oppdag ledere",
    "subtitle": "Paper og demo fra Klarpakke — tydelig merket. Sammenlign resultat og risiko før du følger.",
    "timeframe30": "30 d",
    "timeframe90": "90 d",
    "timeframe7": "7 d",
    "riskLow": "Lavere risiko (forenklet)",
    "riskMedium": "Middels risiko (forenklet)",
    "riskHigh": "Høyere risiko (forenklet)",
    "riskHint": "Risiko er en forenklet indikator fra Sharpe og vinnersrate — ikke investeringsråd.",
    "paperBadge": "Paper / demo",
    "comparisonCaption": "Relativ styrke 30d vs 90d (ikke tidslinje)",
    "followers": "{count} følgere",
    "winRate": "Win rate",
    "sharpe": "Sharpe",
    "fee": "Prestasjonsgebyr",
    "viewProfile": "Se profil",
    "following": "Følger",
    "loadError": "Kunne ikke laste ledere",
    "authRequired": "Du må være innlogget for å se discover-listen.",
    "empty": "Ingen aktive ledere akkurat nå.",
    "emptyNoPublic": "Ingen offentlige tradere funnet akkurat nå. Be teamet sjekke leaderboard_bots og trader_profiles.",
    "emptyBackend": "Kunne ikke hente traderlisten nå. Prøv oppdater igjen om litt.",
    "drawdown": "Drawdown 30d",
    "communityBadge": "Community",
    "filterAll": "Alle",
    "filterFollowing": "Følger",
    "filterFollowingEmpty": "Du følger ingen av de viste lederne i denne listen — bytt til «Alle» eller oppdag nye profiler.",
    "refresh": "Oppdater",
    "refreshing": "Oppdaterer…",
    "loadMore": "Vis flere (opptil 100)",
    "resultsLine": "{visible} vises · {total} hentet for valgt periode",
    "resultsMeta": "I databasen: {bots} kuraterte bots vurdert · {profiles} offentlige profiler",
    "ariaTimeframe": "Velg resultatperiode",
    "ariaFilter": "Filtrer liste"
  },
  "nav": {
    "mine": "Oversikt",
    "discover": "Oppdag"
  },
  "profile": {
    "trustPaper": "Dette er en Klarpakke paper/demo-profil. Resultat er ikke garantert fremover.",
    "trustRisk": "Risikovurdering er forenklet og erstatter ikke egen research."
  }
}

en_copy = {
  "dashboard": {
    "title": "Copy Trading",
    "subtitleActive": "{count} active traders",
    "refresh": "Refresh",
    "totalPnlLabel": "Total copy P&L",
    "mineTitle": "My traders",
    "paused": "Paused",
    "sizingProportional": "Proportional",
    "sizingFixed": "Fixed",
    "recentCopies": "Recent copied trades",
    "emptyTitle": "No traders yet",
    "emptyBody": "Explore curated paper leaders to start safely — or wait as the community grows.",
    "discoverCta": "Discover leaders",
    "settingsAria": "Settings for {name}",
    "maxAlloc": "Max {amount}",
    "latency": "{ms}ms latency",
    "pnlPercentUnavailable": "–",
    "fetchErrorTitle": "Could not load your traders",
    "fetchErrorHint": "Try «Refresh». Are you signed in? If you just started copying, reload the page."
  },
  "discover": {
    "title": "Discover leaders",
    "subtitle": "Paper and Klarpakke demos — clearly labeled. Compare performance and risk before you follow.",
    "timeframe30": "30d",
    "timeframe90": "90d",
    "timeframe7": "7d",
    "riskLow": "Lower risk (simplified)",
    "riskMedium": "Medium risk (simplified)",
    "riskHigh": "Higher risk (simplified)",
    "riskHint": "Risk is a simplified signal from Sharpe and win rate — not investment advice.",
    "paperBadge": "Paper / demo",
    "comparisonCaption": "Relative strength 30d vs 90d (not a timeline)",
    "followers": "{count} followers",
    "winRate": "Win rate",
    "sharpe": "Sharpe",
    "fee": "Performance fee",
    "viewProfile": "View profile",
    "following": "Following",
    "loadError": "Could not load leaders",
    "authRequired": "You must be signed in to view the discover list.",
    "empty": "No active leaders right now.",
    "emptyNoPublic": "No public traders found right now. Ask the team to check leaderboard_bots and trader_profiles.",
    "emptyBackend": "Could not load the trader list right now. Try refreshing again shortly.",
    "drawdown": "30d drawdown",
    "communityBadge": "Community",
    "filterAll": "All",
    "filterFollowing": "Following",
    "filterFollowingEmpty": "You don't follow any leaders in this list — switch to «All» or explore new profiles.",
    "refresh": "Refresh",
    "refreshing": "Refreshing…",
    "loadMore": "Show more (up to 100)",
    "resultsLine": "{visible} shown · {total} loaded for this period",
    "resultsMeta": "In database: {bots} curated bots considered · {profiles} public profiles",
    "ariaTimeframe": "Choose performance period",
    "ariaFilter": "Filter list"
  },
  "nav": {
    "mine": "Overview",
    "discover": "Discover"
  },
  "profile": {
    "trustPaper": "This is a Klarpakke paper/demo profile. Past results do not guarantee future returns.",
    "trustRisk": "Risk labels are simplified and do not replace your own research."
  }
}

patch_file('messages/no.json', no_copy)
patch_file('messages/en.json', en_copy)
print('Patched successfully')
