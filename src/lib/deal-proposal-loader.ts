import { fetchPipedriveDealBundle, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { getProposalConceptByDealId, pipedriveRecordId, upsertProposalConcept } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

/** Laadt een bestaand concept of maakt er één aan — zonder bevestigingsscherm. */
export async function ensureProposalForDeal(dealId: string): Promise<Proposal> {
  const existing = await getProposalConceptByDealId(dealId);
  if (existing) {
    console.info("[create] bestaand proposal geladen", { dealId, proposalId: existing.id });
    return existing;
  }

  if (process.env.PIPEDRIVE_API_TOKEN) {
    try {
      const bundle = await fetchPipedriveDealBundle(dealId);
      const fromPipedrive = mapPipedriveBundleToProposal(dealId, bundle);
      const result = await upsertProposalConcept(fromPipedrive, "advisor");
      console.info("[create] proposal aangemaakt uit Pipedrive", { dealId, proposalId: result.proposal.id });
      return result.proposal;
    } catch (error) {
      console.warn("[create] Pipedrive ophalen mislukt, standaard configurator", { dealId, error });
    }
  }

  const fallback = {
    ...createGuidedProposal(dealId),
    id: pipedriveRecordId(dealId)
  };
  const result = await upsertProposalConcept(fallback, "advisor");
  console.info("[create] proposal aangemaakt met standaardwaarden", { dealId, proposalId: result.proposal.id });
  return result.proposal;
}
