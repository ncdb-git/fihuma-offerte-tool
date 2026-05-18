import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { fetchPipedriveCustomer } from "@/lib/pipedrive";
import { getProposalConceptByDealId, getProposalConceptById } from "@/lib/proposal-store";

export default async function CreateProposalPage({ searchParams }: { searchParams: { deal_id?: string; id?: string } }) {
  const manualId = searchParams.id ?? `manual-${Date.now()}`;
  const dealId = searchParams.deal_id;
  const storedProposal = dealId ? await getProposalConceptByDealId(dealId) : await getProposalConceptById(manualId);
  const proposal = storedProposal ?? createGuidedProposal(dealId ?? manualId);

  if (!storedProposal && dealId && process.env.PIPEDRIVE_API_TOKEN) {
    try {
      proposal.customer = await fetchPipedriveCustomer(dealId);
    } catch {
      proposal.status = "nog te maken";
    }
  }

  return (
    <AuthGate>
      <ProposalBuilder initialProposal={proposal} />
    </AuthGate>
  );
}
