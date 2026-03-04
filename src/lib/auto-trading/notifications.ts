/**
 * Intelligent Notification System
 * Proactive alerts with explanations and educational content
 */

import type { 
  AutoTradingTrade, 
  AutoTradingSession, 
  UserAutoTradingConfig,
  TradingAlert,
  AlertAction
} from './types'
import type { CircuitBreakerCheck, RiskStatus } from './risk-management'
import type { WeeklyReview, StrategyAssessment } from './performance-review'

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertCategory = 
  | 'circuit_breaker'
  | 'trade_executed'
  | 'trade_closed'
  | 'profit_target'
  | 'stop_loss'
  | 'market_regime'
  | 'performance'
  | 'risk_warning'
  | 'education'
  | 'system'

// Re-export from types
export type { TradingAlert, AlertAction }

export function createCircuitBreakerAlert(
  check: CircuitBreakerCheck,
  user_id: string
): TradingAlert {
  const explanations: Record<string, { what: string; why: string; impact: string }> = {
    account_drawdown: {
      what: 'Din totale portefølje har falt med mer enn 20% fra toppen.',
      why: 'Flere tapende trades har akkumulert til en betydelig drawdown.',
      impact: 'For å beskytte din gjenværende kapital, har vi stoppet all auto-trading. Dette er en sikkerhetsmekanisme.'
    },
    strategy_drawdown: {
      what: 'Nåværende strategi har tapt 15% eller mer.',
      why: 'Strategien presterer ikke bra i det nåværende markedet.',
      impact: 'Trading er pauset i flere dager. Bruk tiden til å analysere.'
    },
    consecutive_losses: {
      what: 'Du har hatt flere tapende trades på rad.',
      why: 'Dette kan være normal varians, eller markedet kan ha endret seg.',
      impact: 'En pause forhindrer "revenge trading" - å prøve å vinne tilbake tap raskt.'
    },
    daily_loss_limit: {
      what: 'Daglig tap har nådd 2% av porteføljen.',
      why: 'Flere trades i dag har resultert i tap.',
      impact: 'Trading stoppes for dagen. En god trader vet når han skal slutte.'
    },
    weekly_loss_limit: {
      what: 'Ukentlig tap har nådd 5% av porteføljen.',
      why: 'Uken har vært utfordrende med flere tap.',
      impact: 'Trading pauses til neste uke. God risikostyring beskytter kapital.'
    },
    max_trades_daily: {
      what: 'Maksimalt antall trades for dagen er nådd.',
      why: 'Overtrading øker kostnader og reduserer kvaliteten på beslutninger.',
      impact: 'Vent til i morgen for nye muligheter. Kvalitet over kvantitet!'
    }
  }
  
  const triggered = check.triggered || 'unknown'
  const explanation = explanations[triggered] || {
    what: 'En sikkerhetsgrense ble utløst.',
    why: 'Systemet oppdaget unormal aktivitet eller risiko.',
    impact: 'Trading er midlertidig stoppet for å beskytte din kapital.'
  }
  
  return {
    id: generateAlertId(),
    user_id,
    category: 'circuit_breaker',
    priority: 'critical',
    title: getCircuitBreakerTitle(check),
    message: check.reason || 'Sikkerhetsgrense utløst',
    explanation,
    actions: [
      {
        id: 'acknowledge',
        label: 'Jeg forstår',
        description: 'Bekreft at du har lest meldingen',
        type: 'primary',
        action: 'acknowledge_alert'
      },
      {
        id: 'view_analysis',
        label: 'Se detaljert analyse',
        description: 'Se hva som førte til denne beslutningen',
        type: 'secondary',
        action: 'view_risk_analysis'
      }
    ],
    lesson: {
      topic: 'Kapitalbevaring',
      content: 'De beste traderne er ikke de med høyest win rate, men de som beskytter kapital når markedet er imot dem.',
      keyTakeaway: 'Små, kontrollerte tap er OK. Store tap ødelegger porteføljen.'
    },
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

function getCircuitBreakerTitle(check: CircuitBreakerCheck): string {
  const titles: Record<string, string> = {
    account_drawdown: 'Trading Stoppet - Kritisk Drawdown',
    strategy_drawdown: 'Strategi Pauset - Høy Drawdown',
    consecutive_losses: 'Trading Pauset - Tap på Rad',
    daily_loss_limit: 'Dagens Trading Fullført',
    weekly_loss_limit: 'Uken Trading Fullført',
    max_trades_daily: 'Maks Trades Nådd'
  }
  return titles[check.triggered || ''] || 'Sikkerhetsgrense Utløst'
}

export function createTradeExecutedAlert(
  trade: AutoTradingTrade,
  positionSize: { adjustedPercentage: number; reason: string }
): TradingAlert {
  const isSmallPosition = positionSize.adjustedPercentage < 0.03
  
  return {
    id: generateAlertId(),
    user_id: trade.user_id,
    trade_id: trade.id,
    category: 'trade_executed',
    priority: 'medium',
    title: `Ny ${trade.side === 'LONG' ? 'Long' : 'Short'} Posisjon: ${trade.symbol}`,
    message: `${trade.symbol} ${trade.side.toLowerCase()} åpnet til $${trade.entry_price.toFixed(2)}. Posisjonsstørrelse: ${(positionSize.adjustedPercentage * 100).toFixed(1)}%`,
    explanation: {
      what: `En ny ${trade.side.toLowerCase()} posisjon ble åpnet i ${trade.symbol}.`,
      why: positionSize.reason,
      impact: `Du har nå eksponering mot ${trade.symbol}. Hold øye med utviklingen.`
    },
    data: {
      symbol: trade.symbol,
      side: trade.side,
      entryPrice: trade.entry_price
    },
    actions: [
      {
        id: 'view_trade',
        label: 'Se trade detaljer',
        description: 'Se stop-loss, take-profit og mer',
        type: 'primary',
        action: 'view_trade',
        data: { trade_id: trade.id }
      }
    ],
    lesson: isSmallPosition ? {
      topic: 'Posisjonsstørrelse',
      content: 'Denne posisjonen er mindre enn normalt på grunn av markedssituasjonen. Dette er smart risikostyring.',
      keyTakeaway: 'Tilpass posisjonsstørrelse etter sannsynlighet og marked.'
    } : undefined,
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

export function createTradeClosedAlert(trade: AutoTradingTrade): TradingAlert {
  const pnl = trade.realized_pnl || 0
  const pnlPercent = (pnl / trade.amount) * 100
  const isWin = pnl > 0
  
  const priority: AlertPriority = isWin 
    ? (pnlPercent > 10 ? 'high' : 'medium')
    : (pnlPercent < -5 ? 'high' : 'medium')
  
  const title = isWin 
    ? `Vinnende Trade: +${pnlPercent.toFixed(2)}%`
    : `Tapende Trade: ${pnlPercent.toFixed(2)}%`
  
  let closureReason = ''
  if (trade.close_reason === 'stop_loss') closureReason = 'Stop-loss ble trigget'
  else if (trade.close_reason === 'take_profit') closureReason = 'Take-profit mål nådd'
  else if (trade.close_reason === 'trailing_stop') closureReason = 'Trailing stop ble trigget'
  else closureReason = 'Manuell lukking eller system'
  
  return {
    id: generateAlertId(),
    user_id: trade.user_id,
    trade_id: trade.id,
    category: 'trade_closed',
    priority,
    title: `${title} - ${trade.symbol}`,
    message: `${trade.symbol} ${trade.side.toLowerCase()} lukket. P&L: $${pnl.toFixed(2)} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%). ${closureReason}.`,
    explanation: {
      what: `Posisjonen i ${trade.symbol} ble lukket med ${pnlPercent.toFixed(2)}% ${isWin ? 'gevinst' : 'tap'}.`,
      why: closureReason,
      impact: isWin 
        ? 'Profitten øker din portefølje. Ikke bli overmodig.'
        : 'Tap er en del av trading. Viktigere er at tapet var kontrollert.'
    },
    data: { symbol: trade.symbol, side: trade.side, pnl, pnlPercent },
    actions: [
      {
        id: 'view_trade',
        label: 'Se trade analyse',
        description: 'Se hva som fungerte eller ikke',
        type: 'primary',
        action: 'view_trade_analysis',
        data: { trade_id: trade.id }
      }
    ],
    lesson: !isWin ? {
      topic: 'Håndtering av tap',
      content: `Dette tapet var ${Math.abs(pnlPercent).toFixed(1)}% - innenfor din risikoplan. Små tap er OK.`,
      keyTakeaway: 'Tap er læringsmuligheter, ikke personlige nederlag.'
    } : {
      topic: 'Sikring av gevinster',
      content: 'Gratulerer med gevinst! Konsistens er viktigere enn enkeltgevinster.',
      keyTakeaway: 'La vinnerne løpe, men ta alltid noe profitt.'
    },
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

export function createStopLossWarningAlert(
  trade: AutoTradingTrade,
  currentPrice: number,
  percentToStop: number
): TradingAlert {
  const priority: AlertPriority = percentToStop < 2 ? 'high' : 'medium'
  
  return {
    id: generateAlertId(),
    user_id: trade.user_id,
    trade_id: trade.id,
    category: 'stop_loss',
    priority,
    title: `Stop-Loss Nærmer Seg: ${trade.symbol}`,
    message: `${trade.symbol} handler nå på $${currentPrice.toFixed(2)}, bare ${percentToStop.toFixed(1)}% fra stop-loss.`,
    explanation: {
      what: `Prisen nærmer seg din stop-loss på $${trade.stop_loss.toFixed(2)}.`,
      why: 'Markedet beveger seg mot din forhåndsdefinerte exit.',
      impact: percentToStop < 1
        ? 'Stop-loss vil sannsynligvis trigges snart. Forbered deg på det planlagte tapet.'
        : 'Hold øye med utviklingen, men ikke juster stop-loss nedover.'
    },
    data: {
      symbol: trade.symbol,
      currentPrice,
      entryPrice: trade.entry_price,
      stopLoss: trade.stop_loss
    },
    actions: [
      {
        id: 'view_trade',
        label: 'Se trade',
        description: 'Se full oversikt',
        type: 'primary',
        action: 'view_trade',
        data: { trade_id: trade.id }
      },
      {
        id: 'hold',
        label: 'Hold posisjon',
        description: 'Følg planen og la stop-loss fungere',
        type: 'secondary',
        action: 'acknowledge_alert'
      }
    ],
    lesson: {
      topic: 'Stop-Loss Disiplin',
      content: 'Det er fristende å flytte stop-loss når prisen nærmer seg. Men dette endrer din opprinnelige risiko/reward-plan.',
      keyTakeaway: 'En stop-loss er en kontrakt med deg selv. Respekter den.'
    },
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    acknowledged: false
  }
}

export function createProfitTargetAlert(
  trade: AutoTradingTrade,
  currentPrice: number,
  percentToTarget: number
): TradingAlert {
  return {
    id: generateAlertId(),
    user_id: trade.user_id,
    trade_id: trade.id,
    category: 'profit_target',
    priority: 'medium',
    title: `Profit Target Nærmer Seg: ${trade.symbol}`,
    message: `${trade.symbol} er ${percentToTarget.toFixed(1)}% fra take-profit.`,
    explanation: {
      what: `Prisen nærmer seg ditt profit target på $${trade.take_profit?.toFixed(2)}.`,
      why: 'Handelen utvikler seg som forventet i din favør.',
      impact: 'Du kan vurdere å ta delvis profitt, eller la hele posisjonen nå target.'
    },
    data: {
      symbol: trade.symbol,
      currentPrice,
      entryPrice: trade.entry_price,
      takeProfit: trade.take_profit
    },
    actions: [
      {
        id: 'take_partial',
        label: 'Ta 50% profitt',
        description: 'Lukk halve posisjonen',
        type: 'primary',
        action: 'close_partial',
        data: { trade_id: trade.id, percent: 50 }
      },
      {
        id: 'let_run',
        label: 'La den løpe',
        description: 'Behold til target',
        type: 'secondary',
        action: 'acknowledge_alert'
      }
    ],
    lesson: {
      topic: 'Profitt-taking',
      content: 'Ingen har noensinne gått konkurs ved å ta profitt. Delvis gevinstsikring gir deg "gratis" posisjon på resten.',
      keyTakeaway: 'Det er OK å ta profitt tidlig.'
    },
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    acknowledged: false
  }
}

export function createMarketRegimeAlert(
  user_id: string,
  regime: string,
  previousRegime: string,
  recommendation: string
): TradingAlert {
  const regimeInfo: Record<string, { title: string; description: string; action: string }> = {
    bull: {
      title: 'Bull Marked Oppdaget',
      description: 'Trenden er din venn. Markedet viser styrke.',
      action: 'Normal trading anbefalt.'
    },
    bear: {
      title: 'Bear Marked Oppdaget',
      description: 'Markedet viser svakhet. Lavere topper og bunner.',
      action: 'Trading redusert. Kapitalbevaring prioritert.'
    },
    sideways: {
      title: 'Sideways Marked',
      description: 'Prisen beveger seg uten klar trend.',
      action: 'Mean reversion strategier kan fungere.'
    },
    volatile: {
      title: 'Høy Volatilitet',
      description: 'Store prissvinginger. Økt usikkerhet.',
      action: 'Trading redusert. Større stop-loss kan være nødvendig.'
    }
  }
  
  const info = regimeInfo[regime] || {
    title: 'Marked Endring',
    description: 'Markedet har endret karakter.',
    action: 'Monitor situasjonen.'
  }
  
  return {
    id: generateAlertId(),
    user_id,
    category: 'market_regime',
    priority: regime === 'bear' || regime === 'volatile' ? 'high' : 'medium',
    title: info.title,
    message: `${info.description} ${recommendation}`,
    explanation: {
      what: `Markedet har gått fra ${previousRegime} til ${regime}.`,
      why: 'Tekniske indikatorer indikerer en regimeendring.',
      impact: info.action
    },
    actions: [
      {
        id: 'view_market',
        label: 'Se markedsoversikt',
        description: 'Se detaljert analyse',
        type: 'primary',
        action: 'view_market_analysis'
      }
    ],
    lesson: {
      topic: 'Markedsregimer',
      content: 'Ulike strategier fungerer i ulike markeder. Trend-følging fungerer i bull markets.',
      keyTakeaway: 'Tilpass strategien etter markedet.'
    },
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

export function createWeeklyReviewAlert(review: WeeklyReview): TradingAlert {
  const { assessment, metrics } = review
  const isGood = assessment.score >= 70
  
  return {
    id: generateAlertId(),
    user_id: review.userId,
    category: 'performance',
    priority: assessment.grade === 'F' ? 'high' : 'medium',
    title: `Ukentlig Rapport: Karakter ${assessment.grade}`,
    message: `Siste 30 dager: ${(metrics.totalReturn * 100).toFixed(1)}% avkastning. Win rate: ${(metrics.winRate * 100).toFixed(0)}%.`,
    explanation: {
      what: `Ukentlig gjennomgang. Total score: ${assessment.score}/100.`,
      why: assessment.recommendations[0] || 'Strategien følger planen.',
      impact: isGood 
        ? 'God progresjon! Fortsett med nåværende tilnærming.'
        : 'Justeringer anbefales.'
    },
    actions: [
      {
        id: 'view_report',
        label: 'Se full rapport',
        description: 'Se detaljert analyse',
        type: 'primary',
        action: 'view_weekly_report',
        data: { reportId: review.sessionId }
      }
    ],
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

export function createRiskWarningAlert(user_id: string, status: RiskStatus): TradingAlert {
  const warnings = status.warnings
  const mainWarning = warnings[0] || 'Risikonivå forhøyet'
  
  return {
    id: generateAlertId(),
    user_id,
    category: 'risk_warning',
    priority: status.circuitBreakerStatus === 'blocked' ? 'critical' : 'high',
    title: 'Risikovarsel',
    message: mainWarning,
    explanation: {
      what: 'Din risikoprofil viser tegn til økt risiko.',
      why: `Drawdown: ${(status.currentDrawdown * 100).toFixed(1)}%.`,
      impact: status.circuitBreakerStatus === 'blocked'
        ? 'Trading vil snart stoppes automatisk.'
        : 'Vurder å redusere posisjonsstørrelse.'
    },
    data: {
      portfolioValue: status.portfolioValue,
      currentDrawdown: status.currentDrawdown,
      dailyPnl: status.dailyPnl
    },
    actions: [
      {
        id: 'view_risk',
        label: 'Se risiko-oversikt',
        description: 'Se detaljert risikoanalyse',
        type: 'primary',
        action: 'view_risk_dashboard'
      },
      {
        id: 'reduce_risk',
        label: 'Reduser risiko',
        description: 'Midlertidig senk posisjonsstørrelse',
        type: 'secondary',
        action: 'reduce_risk_level'
      }
    ],
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

export function createEducationalAlert(
  user_id: string,
  topic: string,
  triggeredBy: string
): TradingAlert {
  const lessons: Record<string, { title: string; content: string; takeaway: string }> = {
    position_sizing: {
      title: 'Læringsøyeblikk: Posisjonsstørrelse',
      content: 'Posisjonsstørrelse er den viktigste faktoren for langsiktig suksess.',
      takeaway: 'Aldri risiker mer enn 1-2% av porteføljen per trade.'
    },
    patience: {
      title: 'Læringsøyeblikk: Tålmodighet',
      content: 'De beste traderne tar kanskje 5-10 trades i måneden.',
      takeaway: 'Vent på A+ setups.'
    },
    emotion: {
      title: 'Læringsøyeblikk: Følelser',
      content: 'FOMO fører til dårlige innganger.',
      takeaway: 'Ha en plan før du trader.'
    },
    compound: {
      title: 'Læringsøyeblikk: Rentesrente',
      content: '10% avkastning per måned gir 213% årlig.',
      takeaway: 'Konsistens slår alt annet.'
    }
  }
  
  const lesson = lessons[topic] || {
    title: 'Læringsøyeblikk',
    content: 'Fortsett å lære og forbedre din trading.',
    takeaway: 'Education never stops.'
  }
  
  return {
    id: generateAlertId(),
    user_id,
    category: 'education',
    priority: 'low',
    title: lesson.title,
    message: lesson.content,
    explanation: {
      what: 'Et læringsøyeblikk basert på din aktivitet.',
      why: triggeredBy,
      impact: 'Bedre forståelse fører til bedre beslutninger.'
    },
    actions: [
      {
        id: 'got_it',
        label: 'Forstått!',
        description: 'Marker som lest',
        type: 'primary',
        action: 'acknowledge_alert'
      }
    ],
    lesson: {
      topic: lesson.title,
      content: lesson.content,
      keyTakeaway: lesson.takeaway
    },
    created_at: new Date().toISOString(),
    acknowledged: false
  }
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function filterAlertsByPriority(
  alerts: TradingAlert[],
  minPriority: AlertPriority
): TradingAlert[] {
  const priorityOrder = ['critical', 'high', 'medium', 'low', 'info'] as const
  const minIndex = priorityOrder.indexOf(minPriority)
  
  return alerts.filter(alert => {
    const alertIndex = priorityOrder.indexOf(alert.priority)
    return alertIndex <= minIndex
  })
}

export function getCriticalAlertCount(alerts: TradingAlert[]): number {
  return alerts.filter(a => a.priority === 'critical' && !a.acknowledged).length
}
