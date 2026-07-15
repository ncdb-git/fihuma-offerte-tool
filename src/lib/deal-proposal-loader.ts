import "server-only";

import type { Advisor } from "@/lib/types";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { refreshDealProposalFromPipedrive, shouldRefreshPipedriveFromCrm } from "@/lib/pipedrive-sync";
import {
  allocateProposalId,
  getProposalConceptById,
  listProposalsByDealId,
  upsertProposalConcept
} from "@/lib/proposal-store";
import type { Proposal } from "@/lib/types";

export async function createMinimalProposalForDeal(dealId: string, options?: { advisor?: Advisor }): Promise<Proposal> {
  const guided = createGuidedProposal(dealId);
  const newId = await allocateProposalId(dealId);
  const draft = {
    ...guided,
    id: newId,
    quoteNumber: newId,
    advisor: options?.advisor ?? guided.advisor,
    customer: {
      ...guided.customer,
      pipedriveDealId: dealId,
      pipedriveDealLink: `https://${process.env.PIPEDRIVE_COMPANY_DOMAIN || "app"}.pipedrive.com/deal/${dealId}`
    }
  };
  const result = await upsertProposalConcept(draft, "advisor");
  return result.proposal;
}

/** Snel pad: alleen Supabase, geen blokkerende Pipedrive-call. */
export async function loadProposalForDealFast(
  dealId: string,
  options: { proposalId?: string; createNew?: boolean; advisor?: Advisor } = {}
) {
  if (options.createNew) {
    const proposal = await createMinimalProposalForDeal(dealId, { advisor: options.advisor });
    const siblings = await listProposalsByDealId(dealId);
    return {
      proposal,
      siblings,
      needsPipedriveRefresh: true
    };
  }

  if (options.proposalId) {
    const [proposal, siblings] = await Promise.all([
      getProposalConceptById(options.proposalId),
      listProposalsByDealId(dealId)
    ]);
    if (proposal) {
      return {
        proposal,
        siblings,
        needsPipedriveRefresh: shouldRefreshPipedriveFromCrm(proposal)
      };
    }
  }

  const proposal = await createMinimalProposalForDeal(dealId);
  const siblings = await listProposalsByDealId(dealId);
  return {
    proposal,
    siblings,
    needsPipedriveRefresh: true
  };
}

export async function createNewProposalForDeal(dealId: string, options?: { advisor?: Advisor }): Promise<Proposal> {
  return createMinimalProposalForDeal(dealId, options);
}

type EnsureOptions = {
  proposalId?: string;
  createNew?: boolean;
};

export type EnsureProposalResult = {
  proposal: Proposal;
  siblings: Awaited<ReturnType<typeof listProposalsByDealId>>;
};

/** @deprecated Gebruik loadProposalForDealFast + refreshDealProposalFromPipedrive. */
export async function ensureProposalForDeal(dealId: string, options: EnsureOptions = {}): Promise<EnsureProposalResult> {
  const { proposal, siblings } = await loadProposalForDealFast(dealId, options);
  return { proposal, siblings };
}

export { refreshDealProposalFromPipedrive, shouldRefreshPipedriveFromCrm };
