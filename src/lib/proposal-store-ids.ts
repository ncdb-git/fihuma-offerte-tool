export function isPipedriveDealId(dealId: string) {
  const normalized = dealId?.trim() ?? "";
  return Boolean(normalized && normalized !== "demo" && /^\d+$/.test(normalized));
}

/** @deprecated Gebruik generateProposalId — meerdere offertes per deal zijn toegestaan. */
export function pipedriveRecordId(dealId: string) {
  return `FIH-${dealId}`;
}

export function generateProposalId(dealId: string) {
  const suffix = Date.now().toString(36).slice(-6);
  if (isPipedriveDealId(dealId)) return `FIH-${dealId}-${suffix}`;
  return `FIH-manual-${suffix}`;
}

export function storageKeyForProposal(proposal: { id: string }) {
  return proposal.id;
}
