import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { fetchPipedriveCustomer } from "@/lib/pipedrive";

export default async function CreateProposalPage({ searchParams }: { searchParams: { deal_id?: string } }) {
  const dealId = searchParams.deal_id ?? "demo";
  const proposal = createGuidedProposal(dealId);

  if (process.env.PIPEDRIVE_API_TOKEN && dealId !== "demo") {
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
