import type { Measure, Proposal } from "@/lib/types";
import { calculateProposalFinancials } from "@/lib/subsidy-engine/calculate";
import type { SubsidyEngineContext } from "@/lib/subsidy-engine/types";

export function applyFinancialsToMeasure(measure: Measure, result: ReturnType<typeof calculateProposalFinancials>) {
  const financial = result.measures.find((entry) => entry.measureId === measure.id);
  if (!financial) {
    return { ...measure, subsidies: [], netInvestment: 0 };
  }

  const subsidyStatus =
    result.combinedMeasureCount >= 2 && measure.subsidyStatus !== "double-previous"
      ? "double-fihuma"
      : measure.subsidyStatus ?? "single";

  return {
    ...measure,
    subsidyStatus,
    subsidies: financial.subsidies,
    netInvestment: financial.netInvestment
  };
}

export function applyFinancialsToProposal(proposal: Proposal, context?: SubsidyEngineContext): Proposal {
  const result = calculateProposalFinancials(proposal, context);
  return {
    ...proposal,
    measures: proposal.measures.map((measure) => applyFinancialsToMeasure(measure, result))
  };
}

export function attachSnapshotToProposal(
  proposal: Proposal,
  snapshot: NonNullable<Proposal["calculationSnapshot"]>
): Proposal {
  return {
    ...proposal,
    calculationSnapshot: snapshot,
    subsidyCombinationProposalIds: snapshot.combinationProposalIds,
    measures: proposal.measures.map((measure) => {
      const fromSnapshot = snapshot.result.measures.find((entry) => entry.measureId === measure.id);
      if (!fromSnapshot) return measure;
      return {
        ...measure,
        subsidyStatus: fromSnapshot.isde.status,
        subsidies: fromSnapshot.subsidies,
        netInvestment: fromSnapshot.netInvestment
      };
    })
  };
}
