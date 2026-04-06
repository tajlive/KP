/**
 * White-label Module - MiFID2 Compliance & European Tax
 * 
 * @module trading/white-label
 * @version 3.0.0
 */

// MiFID2 Compliance
export {
  MiFID2Compliance,
  calculateAUMFees,
  DEFAULT_FEE_TIERS,
  type ClientCategory,
  type TradingCapacity,
  type ProductSuitability,
  type OrderStatus,
  type MiFID2OrderMetadata,
  type TransactionReport,
  type BestExecutionReport,
  type SuitabilityAssessment,
  type ProductGovernance,
  type AUMFeeTier,
  type FeeCalculation
} from './mifid2-compliance';

// European Tax
export {
  EuropeanTaxCalculator,
  MultiJurisdictionTaxAggregator,
  type EuropeanJurisdiction,
  type TaxReportConfig,
  type TradeRecord,
  type TaxLot,
  type TaxSummary
} from './european-tax';
