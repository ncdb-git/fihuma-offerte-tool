export function isPipedriveDealId(dealId: string) {
  const normalized = dealId?.trim() ?? "";
  return Boolean(normalized && normalized !== "demo" && /^\d+$/.test(normalized));
}

/** @deprecated Gebruik proposalDisplayNumber — historische id zonder sequence. */
export function pipedriveRecordId(dealId: string) {
  return `FIH-${dealId}`;
}

/** @deprecated Gebruik allocateProposalId uit proposal-store. */
export function generateProposalId(dealId: string) {
  if (isPipedriveDealId(dealId)) return `FIH-${dealId.trim()}-01`;
  const year = new Date().getFullYear();
  return `FIH-MAN-${year}-0001`;
}

export function storageKeyForProposal(proposal: { id: string }) {
  return proposal.id;
}
