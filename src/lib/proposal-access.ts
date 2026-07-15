import "server-only";

import { userCanAccessProposal } from "@/lib/auth-proposals";
import type { SessionUser } from "@/lib/auth-session";
import { getProposalConceptById } from "@/lib/proposal-store";
import { ForbiddenError } from "@/lib/require-api-auth";
import type { Proposal } from "@/lib/types";

export function requireProposalAccess(user: SessionUser, proposal: Proposal) {
  if (!userCanAccessProposal(user, proposal)) {
    throw new ForbiddenError("Je hebt geen toegang tot deze offerte.");
  }
}

export async function requireProposalAccessById(user: SessionUser, proposalId: string) {
  const proposal = await getProposalConceptById(proposalId);
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} niet gevonden`);
  }
  requireProposalAccess(user, proposal);
  return proposal;
}
