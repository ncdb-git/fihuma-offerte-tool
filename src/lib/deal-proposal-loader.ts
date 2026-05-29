import { fetchPipedriveDealBundle, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { resolveCustomerAddressFromBundle } from "@/lib/pipedrive-address";
import { createGuidedProposal, MEASURE_TYPE_LABELS } from "@/lib/proposal-engine";
import {
  generateProposalId,
  getProposalConceptById,
  listProposalsByDealId,
  upsertProposalConcept
} from "@/lib/proposal-store";
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

export async function createNewProposalForDeal(dealId: string): Promise<Proposal> {
  if (process.env.PIPEDRIVE_API_TOKEN) {
    try {
      const bundle = await fetchPipedriveDealBundle(dealId);
      const fromPipedrive = await mapPipedriveBundleToProposal(dealId, bundle);
      const withId = { ...fromPipedrive, id: generateProposalId(dealId) };
      const result = await upsertProposalConcept(withId, "advisor");
      return result.proposal;
    } catch (error) {
      console.warn("[create] Pipedrive ophalen mislukt voor nieuwe offerte", { dealId, error });
    }
  }

  const fallback = {
    ...createGuidedProposal(dealId),
    id: generateProposalId(dealId),
    customer: {
      ...createGuidedProposal(dealId).customer,
      pipedriveDealId: dealId,
      pipedriveDealLink: `https://app.pipedrive.com/deal/${dealId}`
    }
  };
  const result = await upsertProposalConcept(fallback, "advisor");
  return result.proposal;
}

type EnsureOptions = {
  proposalId?: string;
  createNew?: boolean;
};

export type EnsureProposalResult = {
  proposal: Proposal;
  siblings: Awaited<ReturnType<typeof listProposalsByDealId>>;
};

/** Laadt bestaand concept, maakt nieuw concept aan, of opent specifieke offerte. */
export async function ensureProposalForDeal(dealId: string, options: EnsureOptions = {}): Promise<EnsureProposalResult> {
  if (options.createNew) {
    const proposal = await createNewProposalForDeal(dealId);
    return { proposal, siblings: await listProposalsByDealId(dealId) };
  }

  if (options.proposalId) {
    const byId = await getProposalConceptById(options.proposalId);
    if (byId) {
      const backfill = await backfillAddressFromPipedrive(byId, dealId);
      if (backfill.updated) {
        const result = await upsertProposalConcept(backfill.proposal, "advisor");
        return { proposal: result.proposal, siblings: await listProposalsByDealId(dealId) };
      }
      return { proposal: byId, siblings: await listProposalsByDealId(dealId) };
    }
  }

  const siblings = await listProposalsByDealId(dealId);
  const existing = siblings[0]?.proposal;
  if (existing && !options.createNew) {
    const backfill = await backfillAddressFromPipedrive(existing, dealId);
    if (backfill.updated) {
      const result = await upsertProposalConcept(backfill.proposal, "advisor");
      return { proposal: result.proposal, siblings: await listProposalsByDealId(dealId) };
    }
    return { proposal: existing, siblings };
  }

  const created = await createNewProposalForDeal(dealId);
  return { proposal: created, siblings: await listProposalsByDealId(dealId) };
}

export function proposalDisplayTitle(proposal: Proposal) {
  const measure = proposal.measures[0];
  if (measure) {
    return `${MEASURE_TYPE_LABELS[measure.type]} offerte`;
  }
  return proposal.title || proposal.id;
}
