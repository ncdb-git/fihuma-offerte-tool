import "server-only";

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
