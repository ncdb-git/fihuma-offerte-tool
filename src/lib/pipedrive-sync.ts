import "server-only";

import { fetchPipedriveDealBundle, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { invalidateCachedDealBundle, PIPEDRIVE_DEAL_CACHE_TTL_MS } from "@/lib/pipedrive-deal-cache";
import { mergeAdvisorVisiblePipedriveFields } from "@/lib/pipedrive-proposal-merge";
import { upsertProposalConcept } from "@/lib/proposal-store";
import type { Proposal } from "@/lib/types";

export { PIPEDRIVE_DEAL_CACHE_TTL_MS };

export function shouldRefreshPipedriveFromCrm(proposal: Proposal, force = false) {
  if (!process.env.PIPEDRIVE_API_TOKEN) return false;
  const dealId = proposal.customer.pipedriveDealId?.trim() ?? "";
  if (!/^\d+$/.test(dealId)) return false;
  if (force) return true;
  if (!proposal.pipedriveSyncedAt) return true;
  const syncedAt = Date.parse(proposal.pipedriveSyncedAt);
  if (Number.isNaN(syncedAt)) return true;
  return Date.now() - syncedAt > PIPEDRIVE_DEAL_CACHE_TTL_MS;
}

export async function refreshDealProposalFromPipedrive(
  dealId: string,
  proposal: Proposal,
  options: { force?: boolean } = {}
): Promise<{ proposal: Proposal; updated: boolean }> {
  if (!shouldRefreshPipedriveFromCrm(proposal, options.force)) {
    return { proposal, updated: false };
  }

  try {
    const bundle = await fetchPipedriveDealBundle(dealId, { force: options.force });
    const fromPipedrive = await mapPipedriveBundleToProposal(dealId, bundle);
    const enriched: Proposal = {
      ...fromPipedrive,
      id: proposal.id,
      quoteNumber: proposal.quoteNumber ?? proposal.id,
      status: proposal.status,
      createdAt: proposal.createdAt,
      pipedriveSyncedAt: new Date().toISOString()
    };

    const merged = mergeAdvisorVisiblePipedriveFields(proposal, enriched);
    const changed = JSON.stringify(merged) !== JSON.stringify(proposal);
    if (!changed) {
      return { proposal, updated: false };
    }

    const result = await upsertProposalConcept(merged, "advisor");
    invalidateCachedDealBundle(dealId);
    return { proposal: result.proposal, updated: true };
  } catch (error) {
    console.warn("[pipedrive-sync] achtergrond-verversen mislukt", { dealId, proposalId: proposal.id, error });
    return { proposal, updated: false };
  }
}
