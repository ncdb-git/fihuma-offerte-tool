import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { ensureProposalForDeal } from "@/lib/deal-proposal-loader";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { getProposalConceptById, proposalStorageMode } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";

export default async function CreateProposalPage({
  searchParams
}: {
  searchParams: { deal_id?: string; id?: string; proposal_id?: string; new?: string };
}) {
  const manualId = searchParams.id ?? `manual-${Date.now()}`;
  const dealId = searchParams.deal_id;
  const proposalId = searchParams.proposal_id;
  const createNew = searchParams.new === "1";

  if (dealId) {
    const { proposal, siblings } = await ensureProposalForDeal(dealId, { proposalId, createNew });
    console.info("[create] configurator openen", {
      storageMode: proposalStorageMode(),
      dealId,
      proposalId: proposal.id,
      siblingCount: siblings.length,
      createNew
    });

    return (
      <AuthGate>
        <ProposalBuilder dealId={dealId} initialProposal={proposal} siblingProposals={siblings} />
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
