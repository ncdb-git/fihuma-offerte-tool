import { fetchPipedriveDealBundle, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { resolveCustomerAddressFromBundle } from "@/lib/pipedrive-address";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { getProposalConceptByDealId, pipedriveRecordId, upsertProposalConcept } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

async function backfillAddressFromPipedrive(proposal: Proposal, dealId: string) {
  if (!process.env.PIPEDRIVE_API_TOKEN) return { proposal, updated: false as const };

  const bundle = await fetchPipedriveDealBundle(dealId);
  const address = await resolveCustomerAddressFromBundle(bundle);
  if (!address.address && !address.postalCode && !address.city) return { proposal, updated: false as const };

  const nextCustomer = {
    ...proposal.customer,
    address: address.address || proposal.customer.address,
    postalCode: address.postalCode || proposal.customer.postalCode,
    city: address.city || proposal.customer.city
  };

  const changed =
    nextCustomer.address !== proposal.customer.address ||
    nextCustomer.postalCode !== proposal.customer.postalCode ||
    nextCustomer.city !== proposal.customer.city;

  if (!changed) return { proposal, updated: false as const };

  return {
    updated: true as const,
    sources: address.sources,
    proposal: { ...proposal, customer: nextCustomer }
  };
}

/** Laadt een bestaand concept of maakt er één aan — zonder bevestigingsscherm. */
export async function ensureProposalForDeal(dealId: string): Promise<Proposal> {
  const existing = await getProposalConceptByDealId(dealId);
  if (existing) {
    const backfill = await backfillAddressFromPipedrive(existing, dealId);
    if (backfill.updated) {
      const result = await upsertProposalConcept(backfill.proposal, "advisor");
      console.info("[create] adres aangevuld vanuit Pipedrive", { dealId, sources: backfill.sources });
      return result.proposal;
    }
    console.info("[create] bestaand proposal geladen", { dealId, proposalId: existing.id });
    return existing;
  }

  if (process.env.PIPEDRIVE_API_TOKEN) {
    try {
      const bundle = await fetchPipedriveDealBundle(dealId);
      const fromPipedrive = await mapPipedriveBundleToProposal(dealId, bundle);
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
