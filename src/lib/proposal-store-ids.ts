export function isPipedriveDealId(dealId: string) {
  return Boolean(dealId && dealId !== "demo" && !dealId.startsWith("manual-"));
}

export function pipedriveRecordId(dealId: string) {
  return `FIH-${dealId}`;
}

export function storageKeyForProposal(proposal: { id: string; customer: { pipedriveDealId: string } }) {
  const dealId = proposal.customer.pipedriveDealId;
  return isPipedriveDealId(dealId) ? dealId : proposal.id;
}
