/**
 * KLA-137: Trading Safety Core
 * 
 * Server-side safety layer for all trading operations.
 * FAIL CLOSED principle: if in doubt, block the trade.
 */

// Risk validation
export {
  validateTradeAgainstRiskProfile,
  recordTradeRejection,
  recordTradeDecision,
  type RiskValidationResult,
  type TradeRequest,
  type RiskProfile,
  type RejectionReason,
} from "./risk-validator";

// Paper trading (PHYSICALLY SEPARATED)
export {
  executePaperTrade,
  type PaperTradeRequest,
  type PaperTradeResult,
} from "./execute-paper-trade";

// Live trading (PHYSICALLY SEPARATED)
export {
  executeLiveTrade,
  type LiveTradeRequest,
  type LiveTradeResult,
} from "./execute-live-trade";

// Bot health utilities
export {
  getBotHealth,
  updateBotHeartbeat,
  recordBotError,
  transitionBotStatus,
  type BotHealth,
  type BotStatus,
} from "./bot-health";
