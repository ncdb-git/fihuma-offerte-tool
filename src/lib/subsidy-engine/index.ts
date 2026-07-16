export { applyFinancialsToMeasure, applyFinancialsToProposal, attachSnapshotToProposal } from "@/lib/subsidy-engine/apply";
export {
  calculateCombinedFinancials,
  calculateMeasureFinancials,
  calculateProposalFinancials,
  countCombinedEligibleMeasures,
  resolveCombinationProposals
} from "@/lib/subsidy-engine/calculate";
export { calculateIsdeForMeasure, isdeSquareMeters, isdeSubsidyExplanation, measureIsdeEligible } from "@/lib/subsidy-engine/isde";
export { buildSubsidyLines, extractNipEuro } from "@/lib/subsidy-engine/nip";
export {
  createCalculationSnapshot,
  getEffectiveNetInvestment,
  getMeasureFinancialFromSnapshot,
  getSnapshotNetInvestment
} from "@/lib/subsidy-engine/snapshot";
export { ISDE_TARIFFS_2026 } from "@/lib/subsidy-engine/tariffs-2026";
export {
  SUBSIDY_ENGINE_VERSION,
  TARIFF_SET_VERSION,
  type CalculationSnapshot,
  type CalculationSnapshotTrigger,
  type CalculationWarning,
  type MeasureFinancialResult,
  type ProposalFinancialTotals,
  type SubsidyCalculationResult,
  type SubsidyEngineContext
} from "@/lib/subsidy-engine/types";
