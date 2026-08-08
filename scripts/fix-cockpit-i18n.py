#!/usr/bin/env python3
"""Fiks placeholder-verdier i trading.cockpit.* for no/en/zh (2026-08-08).

Erstatter kun verdier som er placeholders/feil-oversettelser i cockpit-namespacet.
Verdier som allerede er korrekte norske (f.eks. 'Maks tap', 'Pris', 'Kjøp') beholdes.
"""
import json

NO_FIXES = {
    "riskBanner": {"title": "Risikovarsel", "crashed": "Krasjet", "dailyLossLimit": "Dags-tap-grense"},
    "error": {
        "title": "Noe gikk galt",
        "description": "Noe gikk galt under lasting. Prøv igjen.",
        "retry": "Prøv igjen",
        "analyticsFailed": "Kunne ikke laste analysen",
    },
    "mode": {"lockedTooltip": "Live-handel krever tilkoblet børs og abonnement", "upgrade": "Oppgrader"},
    "liveModeConfirm": {
        "title": "Bytt til live-handel?",
        "description": "Du er i ferd med å bytte til live-handel med ekte penger. Husk at markedet kan svinge.",
        "rememberDefault": "Husk valget mitt",
    },
    "activation": {
        "activateButton": "Aktiver",
        "error": "Kunne ikke aktivere",
        "missingDescription": "Koble til en børs i innstillingene for å bruke live-handel.",
        "missingTitle": "Mangler børstilkobling",
        "pausedDescription": "Auto-handel er satt på pause. Start den igjen når du er klar.",
        "pausedTitle": "Auto-handel pauset",
        "success": "Aktivert",
    },
    "empty": {
        "sessionsDescription": "Du har ingen økter ennå. Start en robot for å komme i gang.",
        "sessionsTitle": "Ingen økter",
    },
    "sessions": {
        "title": "Økter",
        "columns": {
            "currentCapital": "Kapital nå",
            "startingCapital": "Startkapital",
            "updatedAt": "Sist oppdatert",
        },
        "loadMore": "Last flere",
    },
    "statusLog": {
        "title": "Beslutningslogg",
        "evaluatingSignals": "Vurderer signaler",
        "last_tick_at": "Sist kontrollert",
        "noRecentDecisions": "Ingen nylige beslutninger",
        "tradeFailedNoReason": "Handel mislyktes uten kjent årsak",
    },
    "toast": {
        "sessionStatusChanged": {"title": "Status endret"},
        "startRobotExisting": "Roboten kjører allerede",
        "startRobotSuccess": "Roboten er startet",
    },
    "trades": {
        "title": "Handler",
        "columns": {
            "createdAt": "Opprettet",
            "effectivePnl": "Effektivt P/L",
            "executedAt": "Utført",
            "fee": "Gebyr",
            "realizedPnl": "Realisert P/L",
            "totalValue": "Total verdi",
        },
        "details": {
            "title": "Handelsdetaljer",
            "description": "Detaljer om handelen",
            "noSignal": "Ingen signal",
            "reason": "Årsak",
            "sessionId": "Økt-ID",
        },
        "error": {"title": "Kunne ikke laste handler", "retry": "Prøv igjen"},
        "filters": {
            "title": "Filtrer handler",
            "apply": "Bruk",
            "dateRange": "Tidsperiode",
            "open": "Åpen",
            "reset": "Tilbakestill",
            "sessionStatus": "Økt-status",
            "side": "Kjøp/salg",
            "tradeStatus": "Handelsstatus",
        },
        "loadMore": "Last flere",
        "noTradesDescription": "Du har ingen handler i denne perioden.",
        "noTradesTitle": "Ingen handler",
    },
    "realtime": {"newTrade": {"title": "Ny handel"}},
    "analysis": {
        "title": "Analyse",
        "description": "Se hvordan strategien din har gått.",
        "empty": {"title": "Ingen analyse ennå", "description": "Gjør noen handler, så vises analysen her."},
        "chart": {
            "pnlTitle": "P/L-utvikling",
            "symbolTitle": "Fordeling per valuta",
            "togglePnl": "Vis P/L",
            "toggleTrades": "Vis handler",
        },
        "period": {"label": "Periode"},
        "stats": {
            "bestPair": "Beste valuta",
            "bestSession": "Beste økt",
            "profitFactor": "Profitfaktor",
            "totalFees": "Totale gebyrer",
            "totalPnl": "Totalt P/L",
            "worstPair": "Dårligste valuta",
            "worstSession": "Dårligste økt",
        },
    },
}

EN_FIXES = {
    "riskBanner": {"title": "Risk warning", "crashed": "Crashed", "dailyLossLimit": "Daily loss limit"},
    "error": {
        "title": "Something went wrong",
        "description": "Something went wrong while loading. Try again.",
        "retry": "Try again",
        "analyticsFailed": "Could not load analytics",
    },
    "mode": {"lockedTooltip": "Live trading requires a connected exchange and subscription", "upgrade": "Upgrade"},
    "liveModeConfirm": {
        "title": "Switch to live trading?",
        "description": "You are about to switch to live trading with real money. Markets can move.",
        "rememberDefault": "Remember my choice",
    },
    "activation": {
        "activateButton": "Activate",
        "error": "Could not activate",
        "missingDescription": "Connect an exchange in settings to use live trading.",
        "missingTitle": "No exchange connected",
        "pausedDescription": "Auto trading is paused. Start it again when you are ready.",
        "pausedTitle": "Auto trading paused",
        "success": "Activated",
    },
    "empty": {
        "sessionsDescription": "You have no sessions yet. Start a bot to get going.",
        "sessionsTitle": "No sessions",
    },
    "sessions": {
        "title": "Sessions",
        "columns": {
            "currentCapital": "Capital now",
            "startingCapital": "Starting capital",
            "updatedAt": "Last updated",
        },
        "loadMore": "Load more",
    },
    "statusLog": {
        "title": "Decision log",
        "evaluatingSignals": "Evaluating signals",
        "last_tick_at": "Last checked",
        "noRecentDecisions": "No recent decisions",
        "tradeFailedNoReason": "Trade failed with no known reason",
    },
    "toast": {
        "sessionStatusChanged": {"title": "Status changed"},
        "startRobotExisting": "Bot is already running",
        "startRobotSuccess": "Bot started",
    },
    "trades": {
        "title": "Trades",
        "columns": {
            "createdAt": "Created",
            "effectivePnl": "Effective P/L",
            "executedAt": "Executed",
            "fee": "Fee",
            "realizedPnl": "Realized P/L",
            "totalValue": "Total value",
        },
        "details": {
            "title": "Trade details",
            "description": "Details about the trade",
            "noSignal": "No signal",
            "reason": "Reason",
            "sessionId": "Session ID",
        },
        "error": {"title": "Could not load trades", "retry": "Try again"},
        "filters": {
            "title": "Filter trades",
            "apply": "Apply",
            "dateRange": "Time period",
            "open": "Open",
            "reset": "Reset",
            "sessionStatus": "Session status",
            "side": "Buy/sell",
            "tradeStatus": "Trade status",
        },
        "loadMore": "Load more",
        "noTradesDescription": "You have no trades in this period.",
        "noTradesTitle": "No trades",
    },
    "realtime": {"newTrade": {"title": "New trade"}},
    "analysis": {
        "title": "Analysis",
        "description": "See how your strategy is performing.",
        "empty": {"title": "No analysis yet", "description": "Make some trades and the analysis will appear here."},
        "chart": {
            "pnlTitle": "P/L development",
            "symbolTitle": "Distribution per coin",
            "togglePnl": "Show P/L",
            "toggleTrades": "Show trades",
        },
        "period": {"label": "Period"},
        "stats": {
            "bestPair": "Best coin",
            "bestSession": "Best session",
            "profitFactor": "Profit factor",
            "totalFees": "Total fees",
            "totalPnl": "Total P/L",
            "worstPair": "Worst coin",
            "worstSession": "Worst session",
        },
    },
}

ZH_FIXES = {
    "riskBanner": {"title": "风险提示", "crashed": "已崩溃", "dailyLossLimit": "每日亏损上限"},
    "error": {
        "title": "出了点问题",
        "description": "加载时出了问题。请重试。",
        "retry": "重试",
        "analyticsFailed": "无法加载分析",
    },
    "mode": {"lockedTooltip": "实盘交易需要连接交易所和订阅", "upgrade": "升级"},
    "liveModeConfirm": {
        "title": "切换到实盘交易？",
        "description": "您即将切换到使用真钱的实盘交易。市场可能会波动。",
        "rememberDefault": "记住我的选择",
    },
    "activation": {
        "activateButton": "激活",
        "error": "无法激活",
        "missingDescription": "请在设置中连接交易所以使用实盘交易。",
        "missingTitle": "未连接交易所",
        "pausedDescription": "自动交易已暂停。准备好后重新启动。",
        "pausedTitle": "自动交易已暂停",
        "success": "已激活",
    },
    "empty": {
        "sessionsDescription": "您还没有会话。启动机器人开始吧。",
        "sessionsTitle": "没有会话",
    },
    "sessions": {
        "title": "会话",
        "columns": {
            "currentCapital": "当前资金",
            "startingCapital": "初始资金",
            "updatedAt": "最近更新",
        },
        "loadMore": "加载更多",
    },
    "statusLog": {
        "title": "决策日志",
        "evaluatingSignals": "评估信号",
        "last_tick_at": "最近检查",
        "noRecentDecisions": "暂无近期决策",
        "tradeFailedNoReason": "交易失败，原因未知",
    },
    "toast": {
        "sessionStatusChanged": {"title": "状态已更改"},
        "startRobotExisting": "机器人已在运行",
        "startRobotSuccess": "机器人已启动",
    },
    "trades": {
        "title": "交易",
        "columns": {
            "createdAt": "创建时间",
            "effectivePnl": "有效盈亏",
            "executedAt": "执行时间",
            "fee": "手续费",
            "realizedPnl": "已实现盈亏",
            "totalValue": "总价值",
        },
        "details": {
            "title": "交易详情",
            "description": "有关交易的详细信息",
            "noSignal": "无信号",
            "reason": "原因",
            "sessionId": "会话 ID",
        },
        "error": {"title": "无法加载交易", "retry": "重试"},
        "filters": {
            "title": "筛选交易",
            "apply": "应用",
            "dateRange": "时间段",
            "open": "打开",
            "reset": "重置",
            "sessionStatus": "会话状态",
            "side": "买入/卖出",
            "tradeStatus": "交易状态",
        },
        "loadMore": "加载更多",
        "noTradesDescription": "此时间段内没有交易。",
        "noTradesTitle": "没有交易",
    },
    "realtime": {"newTrade": {"title": "新交易"}},
    "analysis": {
        "title": "分析",
        "description": "查看您的策略表现。",
        "empty": {"title": "暂无分析", "description": "进行一些交易后，分析将显示在这里。"},
        "chart": {
            "pnlTitle": "盈亏走势",
            "symbolTitle": "各币种分布",
            "togglePnl": "显示盈亏",
            "toggleTrades": "显示交易",
        },
        "period": {"label": "时间段"},
        "stats": {
            "bestPair": "最佳币种",
            "bestSession": "最佳会话",
            "profitFactor": "盈利因子",
            "totalFees": "总手续费",
            "totalPnl": "总盈亏",
            "worstPair": "最差币种",
            "worstSession": "最差会话",
        },
    },
}


def apply_fixes(data: dict, fixes: dict) -> int:
    cockpit = data.get("trading", {}).get("cockpit", {})
    changed = 0

    def walk(target: dict, fix: dict, path: str):
        nonlocal changed
        for key, val in fix.items():
            p = f"{path}.{key}"
            if isinstance(val, dict):
                if key not in target or not isinstance(target.get(key), dict):
                    target[key] = {}
                walk(target[key], val, p)
            else:
                if target.get(key) != val:
                    target[key] = val
                    changed += 1
                    print(f"  {p}: -> {val}")

    walk(cockpit, fixes, "trading.cockpit")
    return changed


for lang, fixes in (("no", NO_FIXES), ("en", EN_FIXES), ("zh", ZH_FIXES)):
    path = f"messages/{lang}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    n = apply_fixes(data, fixes)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{lang}: {n} verdier endret")
