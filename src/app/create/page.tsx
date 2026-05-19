import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { ensureProposalForDeal } from "@/lib/deal-proposal-loader";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { getProposalConceptById, proposalStorageMode } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";

export default async function CreateProposalPage({ searchParams }: { searchParams: { deal_id?: string; id?: string } }) {
  const manualId = searchParams.id ?? `manual-${Date.now()}`;
  const dealId = searchParams.deal_id;

  if (dealId) {
    const proposal = await ensureProposalForDeal(dealId);
    console.info("[create] configurator openen", {
      storageMode: proposalStorageMode(),
      dealId,
      found: true,
      proposalId: proposal.id
    });

    return (
      <AuthGate>
        <ProposalBuilder initialProposal={proposal} />
      </AuthGate>
    );
  }

  const storedProposal = await getProposalConceptById(manualId);
  const proposal = storedProposal ?? createGuidedProposal(manualId);

  console.info("[create] handmatige offerte", {
    storageMode: proposalStorageMode(),
    found: Boolean(storedProposal),
    proposalId: proposal.id
  });

  return (
    <AuthGate>
      <ProposalBuilder initialProposal={proposal} />
    </AuthGate>
  );
}
