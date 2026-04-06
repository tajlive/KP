/**
 * Execution Audit Module – Best Execution Logging
 * 
 * @module trading/execution
 * @version 3.0.1-p0
 */

export {
  ExecutionAuditor,
  createL2Snapshot,
  type OrderIntent,
  type OrderSide,
  type OrderStatus,
  type RejectReason,
  type L2Snapshot,
  type VenueScore,
  type ExpectedFill,
  type ActualFill,
  type ExecutionEvidence,
  type CalibrationData
} from './execution-audit';

export {
  AuditStore,
  getAuditStore,
  type AuditQueryOptions,
  type AuditQueryResult,
  type StorageMetrics
} from './audit-store';
