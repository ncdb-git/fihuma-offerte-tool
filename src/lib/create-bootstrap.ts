import "server-only";

import { advisorFromSessionUser } from "@/lib/advisor-resolver";
import type { SessionUser } from "@/lib/auth-session";
import { runWithCreateLoadProfiler } from "@/lib/create-load-profiler";
import { loadProposalForDealFast } from "@/lib/deal-proposal-loader";
import { createBlankManualProposal } from "@/lib/proposal-engine";
import { allocateProposalId, getProposalConceptById, upsertProposalConcept } from "@/lib/proposal-store";
import type { Proposal } from "@/lib/types";

export type CreateBootstrapParams = {
  dealId?: string;
  proposalId?: string;
  manualId?: string;
  createNew?: boolean;
  startManual?: boolean;
  debug?: boolean;
};

export type CreateBootstrapResult = {
  mode: "deal" | "manual_existing" | "manual_created";
  proposal: Proposal;
  dealId?: string;
  siblings?: Awaited<ReturnType<typeof loadProposalForDealFast>>["siblings"];
  needsPipedriveRefresh?: boolean;
};

/** Metadata only — default adviseur op nieuwe handmatige offertes. */
function withSessionAdvisor(proposal: Proposal, user: SessionUser) {
  return {
    ...proposal,
    advisor: advisorFromSessionUser(user)
  };
}

async function bootstrapCreatePageInner(params: CreateBootstrapParams, user: SessionUser): Promise<CreateBootstrapResult> {
  if (params.startManual) {
    const newId = await allocateProposalId();
    const proposal = withSessionAdvisor(createBlankManualProposal(newId), user);
    const result = await upsertProposalConcept(proposal, "advisor");
    return {
      mode: "manual_created",
      proposal: result.proposal
    };
  }

  if (params.dealId) {
    const { proposal, siblings, needsPipedriveRefresh } = await loadProposalForDealFast(params.dealId, {
      proposalId: params.proposalId,
      createNew: params.createNew
    });

    return {
      mode: "deal",
      proposal,
      dealId: params.dealId,
      siblings,
      needsPipedriveRefresh
    };
  }

  const manualId = params.manualId ?? `manual-${Date.now()}`;
  const storedProposal = await getProposalConceptById(manualId);
  if (storedProposal) {
    return {
      mode: "manual_existing",
      proposal: storedProposal
    };
  }

  const newId = await allocateProposalId();
  const proposal = withSessionAdvisor(createBlankManualProposal(newId), user);
  const created = await upsertProposalConcept(proposal, "advisor");
  return {
    mode: "manual_created",
    proposal: created.proposal
  };
}

export async function bootstrapCreatePage(params: CreateBootstrapParams, user: SessionUser) {
  if (params.debug) {
    return runWithCreateLoadProfiler(() => bootstrapCreatePageInner(params, user));
  }
  const result = await bootstrapCreatePageInner(params, user);
  return {
    result,
    profile: {
      pipedriveMs: 0,
      supabaseMs: 0,
      serverMs: 0,
      serverTotalMs: 0,
      spans: []
    }
  };
}
