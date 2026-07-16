import type {
  CalculationSnapshot,
  CalculationSnapshotTrigger,
  CalculationWarning,
  CalculationWarningCode,
  IsdeBreakdown,
  MeasureFinancialResult,
  Proposal,
  ProposalFinancialTotals,
  SubsidyCalculationResult
} from "@/lib/types";

export const SUBSIDY_ENGINE_VERSION = "1.0.0";
export const TARIFF_SET_VERSION = "2026.1";

export type {
  CalculationSnapshot,
  CalculationSnapshotTrigger,
  CalculationWarning,
  CalculationWarningCode,
  IsdeBreakdown,
  MeasureFinancialResult,
  ProposalFinancialTotals,
  SubsidyCalculationResult
};

export type SubsidyEngineContext = {
  siblingProposals?: Proposal[];
  combinationProposalIds?: string[];
};

export type SiblingProposalEntry = {
  proposal: Proposal;
};
