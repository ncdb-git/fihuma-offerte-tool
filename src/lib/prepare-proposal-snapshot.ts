import "server-only";

import { calculateCombinedFinancials } from "@/lib/subsidy-engine";
import { attachSnapshotToProposal, createCalculationSnapshot } from "@/lib/subsidy-engine/server";
import type { CalculationSnapshotTrigger, Proposal } from "@/lib/types";

/**
 * Snapshot voor één offerte (PDF / Pipedrive upload).
 * Combinatie van meerdere offertes hoort in de toekomstige verzendflow.
 */
export async function prepareProposalWithSnapshot(
  proposal: Proposal,
  trigger: CalculationSnapshotTrigger
): Promise<Proposal> {
  const snapshot = createCalculationSnapshot(proposal, trigger);
  return attachSnapshotToProposal(proposal, snapshot);
}

/**
 * Voorbereiding voor de toekomstige "Versturen naar klant"-flow.
 * Adviseur selecteert één of meerdere afgeronde offertes; engine berekent
 * gezamenlijke ISDE (verdubbeling) en totale netto. Nog niet aangesloten op UI.
 */
export function prepareCombinedProposalsForSend(
  selectedProposals: Proposal[],
  trigger: CalculationSnapshotTrigger = "email_send"
): {
  combinationIds: string[];
  perProposal: Proposal[];
  combinedTotals: {
    bruto: number;
    adjustments: number;
    payableToFihuma: number;
    isde: number;
    nip: number;
    totalSubsidies: number;
    netInvestment: number;
    isNegative: boolean;
    isZero: boolean;
  };
} {
  if (selectedProposals.length === 0) {
    throw new Error("Selecteer minstens één offerte om te versturen.");
  }

  const primary = selectedProposals[0]!;
  const combined = calculateCombinedFinancials(primary, selectedProposals);

  const perProposal = selectedProposals.map((proposal) => {
    const snapshot = createCalculationSnapshot(proposal, trigger, {
      combinationProposalIds: combined.combinationIds,
      siblingProposals: selectedProposals.filter((entry) => entry.id !== proposal.id)
    });
    return attachSnapshotToProposal(proposal, snapshot);
  });

  const combinedNet = Math.round(
    perProposal.reduce((sum, proposal) => sum + (proposal.calculationSnapshot?.result.totals.netInvestment ?? 0), 0) * 100
  ) / 100;

  return {
    combinationIds: combined.combinationIds,
    perProposal,
    combinedTotals: {
      ...combined.primary.totals,
      netInvestment: combinedNet
    }
  };
}
