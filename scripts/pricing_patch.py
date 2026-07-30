import json, os, re
os.chdir('/Users/taj/klarpakke')

def patch(path, updates):
    with open(path) as f:
        d = json.load(f)
    for k, v in updates.items():
        if isinstance(v, dict) and k in d and isinstance(d[k], dict):
            d[k].update(v)
        else:
            d[k] = v
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'\u2705 {path}')

patch('messages/no/pricing.json', {
  'comparison': {
    'title': 'Sammenlign planer', 'feature': 'Funksjon', 'rowPaper': 'Paper trading',
    'kltLabel': 'KLT-poeng/mnd', 'kltStudent': '100', 'kltBachelor': '300',
    'kltMaster': '750', 'kltPhd': '2\u202f000', 'kltProfessor': '5\u202f000',
    'rowModules': 'L\u00e6ringsmoduler', 'rowAi': 'AI-assistent', 'rowAutoTrading': 'Autohandel',
    'autoStudent': '\u2014', 'autoBachelor': 'Paper', 'autoMaster': 'Paper + Live',
    'autoPhd': 'Paper + Live', 'autoProfessor': 'Paper + Live',
    'rowSupport': 'Support', 'supportStudent': 'Community', 'supportBachelor': 'Priority',
    'supportMaster': 'Priority', 'supportPhd': 'VIP', 'supportProfessor': 'VIP',
    'rowTax': 'Skatteeksport', 'rowDiscord': 'Discord-kanal'
  },
  'faq': {
    'q2': 'Kan jeg bytte plan senere?',
    'a2': 'Ja, du kan oppgradere eller nedgradere n\u00e5r som helst. Endringer trer i kraft ved neste faktureringsperiode.',
    'q3': 'Hva er forskjellen p\u00e5 paper og live trading?',
    'a3': 'Lekepenger er risikofri \u00f8ving med 100\u202f000 kr. Live trading bruker ekte penger p\u00e5 Binance.',
    'q4': 'Kan jeg f\u00e5 refusjon?',
    'a4': 'Nei. Du betaler for tilgang til verkt\u00f8yene v\u00e5re. Paper trading er gratis og ubegrenset. Betalte planer gir umiddelbar tilgang til live trading, flere strategier og avanserte verkt\u00f8y \u2014 p\u00e5 samme m\u00e5te som et programvare-abonnement.',
    'q5': 'Er det bindingstid?',
    'a5': 'Nei, ingen bindingstid. Du kan si opp n\u00e5r som helst.'
  },
  'hero': {'currencyNote': 'Listepris i NOK. I kassen kan du velge NOK, EUR eller USD.'},
  'freeForever': 'for alltid'
})

patch('messages/en/pricing.json', {
  'comparison': {
    'title': 'Compare plans', 'feature': 'Feature', 'rowPaper': 'Paper trading',
    'kltLabel': 'KLT points/mo', 'kltStudent': '100', 'kltBachelor': '300',
    'kltMaster': '750', 'kltPhd': '2,000', 'kltProfessor': '5,000',
    'rowModules': 'Learning modules', 'rowAi': 'AI assistant', 'rowAutoTrading': 'Auto-trading',
    'autoStudent': '\u2014', 'autoBachelor': 'Paper', 'autoMaster': 'Paper + Live',
    'autoPhd': 'Paper + Live', 'autoProfessor': 'Paper + Live',
    'rowSupport': 'Support', 'supportStudent': 'Community', 'supportBachelor': 'Priority',
    'supportMaster': 'Priority', 'supportPhd': 'VIP', 'supportProfessor': 'VIP',
    'rowTax': 'Tax export', 'rowDiscord': 'Discord channel'
  },
  'faq': {
    'q2': 'Can I switch plans later?',
    'a2': 'Yes, you can upgrade or downgrade at any time. Changes take effect at the next billing period.',
    'q3': 'What is the difference between paper and live trading?',
    'a3': 'Paper trading is risk-free practice with virtual funds. Live trading uses real money on Binance.',
    'q4': 'Can I get a refund?',
    'a4': 'No. You pay for access to our tools. Paper trading is free and unlimited. Paid plans unlock live trading, more strategies and advanced tools \u2014 like a software subscription.',
    'q5': 'Is there a commitment?',
    'a5': 'No commitment. You can cancel at any time.'
  },
  'hero': {'currencyNote': 'Prices shown in NOK. At checkout you can pay in NOK, EUR, or USD.'},
  'freeForever': 'forever'
})

# --- PriserClient.tsx ---
path = 'src/app/[locale]/(marketing)/priser/PriserClient.tsx'
with open(path) as f:
    src = f.read()

m = re.search(r'const legacyFaqs = \[[\s\S]*?\];', src)
if m:
    src = src.replace(m.group(), '''const legacyFaqs = [
  { q: t("faq.q2"), a: t("faq.a2") },
  { q: t("faq.q3"), a: t("faq.a3") },
  { q: t("faq.q4"), a: t("faq.a4") },
  { q: t("faq.q5"), a: t("faq.a5") },
];''')
    print('\u2705 legacyFaqs -> t() kall')

if '"for alltid" : "forever"' in src:
    src = re.sub(r'locale\s*===\s*"no"\s*\?\s*"for alltid"\s*:\s*"forever"', 't("freeForever")', src)
    print('\u2705 freeForever')

src = re.sub(
    r'locale\s*===\s*"no"\s*\n\s*\?\s*"Listepris i NOK[^"]*"\s*\n\s*:\s*"Prices shown in NOK[^"]*"',
    't("hero.currencyNote")', src
)
print('\u2705 currencyNote (regex)')

with open(path, 'w') as f:
    f.write(src)
print('\u2705 PriserClient.tsx oppdatert')
print('\nKlar for: git add + commit')
