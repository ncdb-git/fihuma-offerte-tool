import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { ensureProposalForDeal } from "@/lib/deal-proposal-loader";
import { createBlankManualProposal } from "@/lib/proposal-engine";
import { allocateProposalId, getProposalConceptById, proposalStorageMode, upsertProposalConcept } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";

type CreateSearchParams = {
  deal_id?: string;
  id?: string;
  proposal_id?: string;
  new?: string;
  manual?: string;
};

async function resolveSearchParams(searchParams: CreateSearchParams | Promise<CreateSearchParams>) {
  return Promise.resolve(searchParams);
}

function CreateError({ message }: { message: string }) {
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

export default async function CreateProposalPage({
  searchParams
}: {
  searchParams: CreateSearchParams | Promise<CreateSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const manualId = params.id ?? `manual-${Date.now()}`;
  const dealId = params.deal_id;
  const proposalId = params.proposal_id;
  const createNew = params.new === "1";
  const startManual = params.manual === "1";

  if (startManual) {
    try {
      const result = await upsertProposalConcept(createBlankManualProposal(), "advisor");
      return (
        <AuthGate>
          <ProposalBuilder initialProposal={result.proposal} />
        </AuthGate>
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Blanco offerte aanmaken mislukt.";
      console.error("[create] handmatige offerte mislukt", error);
      return <CreateError message={message} />;
    }
  }

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
      return <CreateError message={message} />;
    }
  }

  try {
    const storedProposal = await getProposalConceptById(manualId);
    if (storedProposal) {
      return (
        <AuthGate>
          <ProposalBuilder initialProposal={storedProposal} />
        </AuthGate>
      );
    }

    const newId = await allocateProposalId();
    const created = await upsertProposalConcept(createBlankManualProposal(newId), "advisor");

    console.info("[create] handmatige offerte", {
      storageMode: proposalStorageMode(),
      proposalId: created.proposal.id
    });

    return (
      <AuthGate>
        <ProposalBuilder initialProposal={created.proposal} />
      </AuthGate>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offerte laden mislukt.";
    console.error("[create] offerte laden mislukt", { manualId, error });
    return <CreateError message={message} />;
  }
}
