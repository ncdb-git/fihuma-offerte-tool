import "server-only";

import type { SessionUser } from "@/lib/auth-session";
import { getProposalConceptById } from "@/lib/proposal-store";
import type { Proposal } from "@/lib/types";

/**
 * Alleen inloggen is vereist — advisor bepaalt geen toegang meer.
 * Houdt de functionele naam voor call sites die "bestaat deze offerte?" checken.
 */
export function requireProposalAccess(_user: SessionUser, _proposal: Proposal) {
  // no-op: zichtbaarheid/autorisatie hangt niet meer af van advisor
}

export async function requireProposalAccessById(_user: SessionUser, proposalId: string) {
  const proposal = await getProposalConceptById(proposalId);
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} niet gevonden`);
  }
  return proposal;
}
