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
    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Configurator laden mislukt.";
      console.error("[create] configurator fout", { dealId, createNew, error });
      return (
        <AuthGate>
          <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
            <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-panel">
              <h1 className="text-lg font-black text-red-800">Offerte openen mislukt</h1>
              <p className="mt-2 text-sm text-[#4a5751]">{message}</p>
              <a className="mt-4 inline-block text-sm font-bold text-fihuma-green underline" href="/dashboard">
                Terug naar werkvoorraad
              </a>
            </div>
          </main>
        </AuthGate>
      );
    }
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
