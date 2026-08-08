#!/usr/bin/env python3
"""
fill-placeholders.py — Erstatter ALLE gjenværende placeholder-verdier
(«Tittel»/«Beskrivelse»/«Etikett»/«Verdi»/«Retry») i messages/{no,en,zh}.json
med ekte, nybegynner-vennlige norske/engelske/kinesiske oversettelser.

Kjøres idempotent: re-kjøring endrer ingenting.

2026-08-08: funnet via i18n-keys-kildekodeaudit — 90+ placeholders ga «Tittel»
på flere prod-sider (samme bugklasse som trading.cockpit.*).
"""
import json, sys

# {sti: {"no": ..., "en": ..., "zh": ...}}
FILL = {
    # --- admin ---
    "admin.impersonation.title": {"no": "Impersonering", "en": "Impersonation", "zh": "模拟登录"},
    "admin.impersonation.description": {"no": "Logg inn som en annen bruker for å se deres opplevelse.", "en": "Sign in as another user to see their experience.", "zh": "以其他用户身份登录以查看其体验。"},

    # --- common ---
    "common.title": {"no": "Klarpakke", "en": "Klarpakke", "zh": "Klarpakke"},
    "common.speedOnboarding.step1.title": {"no": "Velkommen", "en": "Welcome", "zh": "欢迎"},
    "common.speedOnboarding.step2.title": {"no": "Sett opp kontoen", "en": "Set up your account", "zh": "设置账户"},
    "common.speedOnboarding.step3.title": {"no": "Klar til å handle", "en": "Ready to trade", "zh": "准备交易"},
    "common.interactive.step1.title1": {"no": "Velg strategi", "en": "Choose a strategy", "zh": "选择策略"},
    "common.interactive.step1.title2": {"no": "Justér risiko", "en": "Adjust risk", "zh": "调整风险"},
    "common.interactive.step1.description": {"no": "Finn en strategi som passer din stil, og velg hvor mye risiko du vil ta.", "en": "Find a strategy that fits your style and choose how much risk you want to take.", "zh": "找到适合您风格的策略，并选择您愿意承担的风险程度。"},
    "common.interactive.step2.title": {"no": "Følg med i sanntid", "en": "Follow in real time", "zh": "实时跟踪"},
    "common.interactive.step3.title": {"no": "Start med lekepenger", "en": "Start with play money", "zh": "使用模拟资金开始"},
    "common.interactive.step4.title": {"no": "Gå live når du er klar", "en": "Go live when ready", "zh": "准备好后开始实盘"},
    "common.mobile.step2.title": {"no": "Sett opp kontoen", "en": "Set up your account", "zh": "设置账户"},

    # --- dashboard ---
    "dashboard.recentTrades.title": {"no": "Siste handler", "en": "Recent trades", "zh": "最近交易"},

    # --- legal/cookies ---
    "legal.cookies.title": {"no": "Informasjonskapsler", "en": "Cookies", "zh": "Cookie"},
    "legal.cookies.whatAreCookies.title": {"no": "Hva er informasjonskapsler?", "en": "What are cookies?", "zh": "什么是 Cookie？"},
    "legal.cookies.categories.title": {"no": "Kategorier", "en": "Categories", "zh": "类别"},
    "legal.cookies.categories.necessary.description": {"no": "Nødvendige kapsler holder tjenesten sikker og fungerende.", "en": "Necessary cookies keep the service secure and working.", "zh": "必要 Cookie 确保服务安全运行。"},
    "legal.cookies.categories.analytics.description": {"no": "Analytiske kapsler hjelper oss å forstå hvordan siden brukes.", "en": "Analytics cookies help us understand how the site is used.", "zh": "分析 Cookie 帮助我们了解网站的使用情况。"},
    "legal.cookies.categories.marketing.description": {"no": "Markedsføringskapsler brukes kun med ditt samtykke.", "en": "Marketing cookies are only used with your consent.", "zh": "营销 Cookie 仅在获得您同意时使用。"},
    "legal.cookies.categories.functional.description": {"no": "Funksjonelle kapsler husker dine valg og preferanser.", "en": "Functional cookies remember your choices and preferences.", "zh": "功能性 Cookie 记住您的选择和偏好。"},
    "legal.cookies.thirdParty.title": {"no": "Tredjeparter", "en": "Third parties", "zh": "第三方"},
    "legal.cookies.manage.title": {"no": "Administrer samtykke", "en": "Manage consent", "zh": "管理同意"},
    "legal.cookies.contact.title": {"no": "Kontakt", "en": "Contact", "zh": "联系我们"},

    # --- navigation ---
    "navigation.security.title": {"no": "Sikkerhet", "en": "Security", "zh": "安全"},

    # --- components ---
    "components.livePill.label": {"no": "Live", "en": "Live", "zh": "实盘"},

    # --- onboarding (welcomePage/paperSetup/step4/aiMapping/mobile) ---
    "onboarding.welcomePage.hero.title": {"no": "Velkommen til Klarpakke", "en": "Welcome to Klarpakke", "zh": "欢迎来到 Klarpakke"},
    "onboarding.welcomePage.benefits.title": {"no": "Hva du får", "en": "What you get", "zh": "您将获得"},
    "onboarding.welcomePage.benefits.items.paperMoney.title": {"no": "100 000 kr i lekepenger", "en": "NOK 100,000 in play money", "zh": "100,000 克朗模拟资金"},
    "onboarding.welcomePage.benefits.items.journal.title": {"no": "Handelsjournal", "en": "Trading journal", "zh": "交易日志"},
    "onboarding.welcomePage.benefits.items.influence.title": {"no": "Påvirke produktet", "en": "Shape the product", "zh": "影响产品"},
    "onboarding.welcomePage.benefits.items.kltPoints.title": {"no": "KLT-poeng", "en": "KLT points", "zh": "KLT 积分"},
    "onboarding.welcomePage.steps.title": {"no": "Slik kommer du i gang", "en": "How to get started", "zh": "如何开始"},
    "onboarding.welcomePage.steps.items.checkStatus.title": {"no": "Sjekk status", "en": "Check your status", "zh": "查看状态"},
    "onboarding.welcomePage.steps.items.dashboard.title": {"no": "Utforsk dashbordet", "en": "Explore the dashboard", "zh": "探索仪表盘"},
    "onboarding.welcomePage.steps.items.wait.title": {"no": "Vent på godkjenning", "en": "Wait for approval", "zh": "等待批准"},
    "onboarding.welcomePage.safety.title": {"no": "Dine penger er trygge", "en": "Your money is safe", "zh": "您的资金是安全的"},
    "onboarding.welcomePage.cta.title": {"no": "Start gratis", "en": "Start for free", "zh": "免费开始"},
    "onboarding.paperSetup.title": {"no": "Sett opp lekepenger", "en": "Set up play money", "zh": "设置模拟资金"},
    "onboarding.step4.title": {"no": "Koble til børsen", "en": "Connect your exchange", "zh": "连接交易所"},
    "onboarding.step4.security.title": {"no": "Sikker tilkobling", "en": "Secure connection", "zh": "安全连接"},
    "onboarding.step4.security.description": {"no": "Nøklene dine krypteres og brukes kun for å utføre dine handler.", "en": "Your keys are encrypted and only used to execute your trades.", "zh": "您的密钥经过加密，仅用于执行您的交易。"},
    "onboarding.step4.apiKey.label": {"no": "API-nøkkel", "en": "API key", "zh": "API 密钥"},
    "onboarding.step4.apiSecret.label": {"no": "Hemmelig nøkkel", "en": "API secret", "zh": "API 密钥（Secret）"},
    "onboarding.aiMapping.title": {"no": "AI-tilordning", "en": "AI mapping", "zh": "AI 映射"},
    "onboarding.mobile.step1.title": {"no": "Start enkelt", "en": "Start simple", "zh": "简单开始"},
    "onboarding.mobile.step1.description": {"no": "Opprett en konto og få 100 000 kr i lekepenger.", "en": "Create an account and get NOK 100,000 in play money.", "zh": "创建账户并获得 100,000 克朗模拟资金。"},
    "onboarding.mobile.step3.title": {"no": "Klar til å handle", "en": "Ready to trade", "zh": "准备交易"},
    "onboarding.mobile.step3.description": {"no": "Start din første handel med null risiko.", "en": "Start your first trade with zero risk.", "zh": "零风险开始您的第一笔交易。"},

    # --- pricing ---
    "pricing.description": {"no": "Velg planen som passer deg. Start gratis med lekepenger.", "en": "Choose the plan that fits you. Start free with play money.", "zh": "选择适合您的方案。使用模拟资金免费开始。"},

    # --- strategyMarketplace ---
    "strategyMarketplace.metadata.title": {"no": "Strategi-marked", "en": "Strategy marketplace", "zh": "策略市场"},
    "strategyMarketplace.metadata.description": {"no": "Utforsk og kopier velprøvde handelsstrategier.", "en": "Explore and copy proven trading strategies.", "zh": "探索并复制经过验证的交易策略。"},

    # --- trading (kjerneside!) ---
    "trading.title": {"no": "Handel", "en": "Trade", "zh": "交易"},
    "trading.retry": {"no": "Prøv igjen", "en": "Retry", "zh": "重试"},
    "trading.positions.empty.title": {"no": "Ingen posisjoner", "en": "No positions", "zh": "暂无持仓"},
    "trading.positions.empty.description": {"no": "Når du åpner en posisjon, vises den her.", "en": "When you open a position, it will appear here.", "zh": "当您开仓时，持仓将显示在这里。"},
    "trading.paperTrading.workspaceHeader.title": {"no": "Lekepenger", "en": "Play money", "zh": "模拟资金"},
    "trading.paperTrading.description": {"no": "Handel med lekepenger og øv deg uten risiko.", "en": "Trade with play money and practise without risk.", "zh": "使用模拟资金交易，零风险练习。"},
    "trading.positionLots.title": {"no": "Posisjonsstørrelse", "en": "Position size", "zh": "仓位大小"},
    "trading.tradeAmountSlider.title": {"no": "Beløp per handel", "en": "Amount per trade", "zh": "每笔交易金额"},
    "trading.tradeAmountSlider.status.blocked.description": {"no": "Handel er midlertidig blokkert. Sjekk meldingen over.", "en": "Trading is temporarily blocked. Check the message above.", "zh": "交易暂时被阻止。请查看上方消息。"},
    "trading.tradeAmountSlider.status.warning.title": {"no": "Vær forsiktig", "en": "Be careful", "zh": "请谨慎"},
    "trading.tradeAmountSlider.status.caution.description": {"no": "Beløpet er høyt i forhold til saldoen din.", "en": "The amount is high relative to your balance.", "zh": "金额相对于您的余额偏高。"},
    "trading.tradeAmountSlider.status.ok.description": {"no": "Beløpet er innenfor trygge rammer.", "en": "The amount is within safe limits.", "zh": "金额在安全范围内。"},
    "trading.tradeAmountSlider.paperTrading.title": {"no": "Lekepenger-modus", "en": "Play money mode", "zh": "模拟资金模式"},
    "trading.tradeAmountSlider.paperTrading.description": {"no": "Du handler med lekepenger — ingen ekte penger risikeres.", "en": "You are trading with play money — no real money is at risk.", "zh": "您正在使用模拟资金交易 — 无真实资金风险。"},
    "trading.signalFeed.title": {"no": "Signaler", "en": "Signals", "zh": "信号"},
    "trading.botStatus.description": {"no": "Roboten er aktiv og følger strategien din.", "en": "The bot is active and following your strategy.", "zh": "机器人正在运行并遵循您的策略。"},
    "trading.botStatus.value": {"no": "Aktiv", "en": "Active", "zh": "运行中"},
    "trading.aggressivitySlider.levels.title": {"no": "Aggressivitetsnivå", "en": "Aggressiveness level", "zh": "激进程度"},
    "trading.modeSelector.title": {"no": "Handelsmodus", "en": "Trading mode", "zh": "交易模式"},
    "trading.sessionDetail.value": {"no": "Detaljer", "en": "Details", "zh": "详情"},
    "trading.strategyPicker.title": {"no": "Velg strategi", "en": "Choose a strategy", "zh": "选择策略"},
    "trading.activeStrategiesPanel.title": {"no": "Aktive strategier", "en": "Active strategies", "zh": "活跃策略"},
    "trading.tradingModeSelector.title": {"no": "Handelsmodus", "en": "Trading mode", "zh": "交易模式"},
    "trading.tradingModeSelector.paper.title": {"no": "Lekepenger", "en": "Play money", "zh": "模拟资金"},
    "trading.tradingModeSelector.paper.description": {"no": "Øv deg med 100 000 kr i lekepenger. Null risiko.", "en": "Practise with NOK 100,000 in play money. Zero risk.", "zh": "使用 100,000 克朗模拟资金练习。零风险。"},
    "trading.tradingModeSelector.live.title": {"no": "Live", "en": "Live", "zh": "实盘"},
    "trading.tradingModeSelector.live.description": {"no": "Handle med ekte penger på børsen.", "en": "Trade with real money on the exchange.", "zh": "在交易所使用真实资金交易。"},
    "trading.tradingModeSelector.liveWarning.title": {"no": "Viktig", "en": "Important", "zh": "重要"},
    "trading.tradingModeSelector.liveWarning.description": {"no": "Live-handel innebærer reell risiko for tap.", "en": "Live trading involves real risk of loss.", "zh": "实盘交易存在真实的亏损风险。"},

    # --- wallet ---
    "wallet.balances.value": {"no": "Saldo", "en": "Balance", "zh": "余额"},
}

def has_path(d, path):
    for p in path.split('.'):
        if not isinstance(d, dict) or p not in d: return False
        d = d[p]
    return True

def deep_set(d, path, value):
    parts = path.split('.')
    for p in parts[:-1]:
        d = d.setdefault(p, {})
    d[parts[-1]] = value

def get_nested(d, path):
    for p in path.split('.'):
        if not isinstance(d, dict) or p not in d: return None
        d = d[p]
    return d

changed = 0
for lang in ['no', 'en', 'zh']:
    path = f'messages/{lang}.json'
    d = json.load(open(path))
    for key, vals in FILL.items():
        if has_path(d, key) and get_nested(d, key) != vals[lang]:
            deep_set(d, key, vals[lang])
            changed += 1
    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)

print(f"Fylt ut {changed} placeholder-verdier ({len(FILL)} nøkler × 3 språk)")
