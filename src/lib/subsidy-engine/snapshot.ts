import { randomUUID } from "node:crypto";
import { calculateProposalFinancials } from "@/lib/subsidy-engine/calculate";
import { SUBSIDY_ENGINE_VERSION, TARIFF_SET_VERSION, type SubsidyEngineContext } from "@/lib/subsidy-engine/types";
import type { CalculationSnapshot, CalculationSnapshotTrigger, Proposal } from "@/lib/types";

export function createCalculationSnapshot(
  proposal: Proposal,
  trigger: CalculationSnapshotTrigger,
  context?: SubsidyEngineContext
): CalculationSnapshot {
  const result = calculateProposalFinancials(proposal, context);
  return {
    id: randomUUID(),
    engineVersion: SUBSIDY_ENGINE_VERSION,
    tariffSetVersion: TARIFF_SET_VERSION,
    calculatedAt: new Date().toISOString(),
    trigger,
    combinationProposalIds: result.combinationProposalIds,
    result
  };
}

export function getSnapshotNetInvestment(proposal: Proposal): number | null {
  const snapshot = proposal.calculationSnapshot;
  if (!snapshot?.result?.totals) return null;
  return snapshot.result.totals.netInvestment;
}

export function getEffectiveNetInvestment(proposal: Proposal): number | null {
  const fromSnapshot = getSnapshotNetInvestment(proposal);
  if (fromSnapshot !== null) return fromSnapshot;

  const hasPricing = proposal.measures.some(
    (measure) => measure.grossInvestment > 0 || measure.extraWork.length > 0 || (measure.adjustments?.length ?? 0) > 0
  );
  if (!hasPricing) return null;
  return proposal.measures.reduce((sum, measure) => sum + measure.netInvestment, 0);
}

export function getMeasureFinancialFromSnapshot(proposal: Proposal, measureId: string) {
  return proposal.calculationSnapshot?.result.measures.find((entry) => entry.measureId === measureId) ?? null;
}
