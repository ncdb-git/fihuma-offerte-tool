import { AuthGate } from "@/components/auth/AuthGate";
import { CreateConceptPrompt } from "@/components/builder/CreateConceptPrompt";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { getProposalConceptByDealId, getProposalConceptById } from "@/lib/proposal-store";

export default async function CreateProposalPage({ searchParams }: { searchParams: { deal_id?: string; id?: string } }) {
  const manualId = searchParams.id ?? `manual-${Date.now()}`;
  const dealId = searchParams.deal_id;
  const storedProposal = dealId ? await getProposalConceptByDealId(dealId) : await getProposalConceptById(manualId);

  if (dealId && !storedProposal) {
    return (
      <AuthGate>
        <CreateConceptPrompt dealId={dealId} />
      </AuthGate>
    );
  }

  const proposal = storedProposal ?? createGuidedProposal(manualId);

  return (
    <AuthGate>
      <ProposalBuilder initialProposal={proposal} />
    </AuthGate>
  );
}
