import { NextResponse } from "next/server";
import { createGuidedProposal } from "@/lib/proposal-engine";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { supabaseEnv } from "@/lib/supabase-proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — sla dummy proposal op in Supabase zonder Pipedrive. */
export async function POST() {
  const env = supabaseEnv();

  if (!env.supabaseUrlPresent || !env.supabaseServiceRoleKeyPresent) {
    return NextResponse.json(
      {
        ok: false,
        reason: "supabase_not_configured",
        ...env
      },
      { status: 503 }
    );
  }

  const testDealId = `debug-${Date.now()}`;
  const proposal = createGuidedProposal(testDealId);
  proposal.customer.pipedriveDealId = testDealId;
  proposal.customer.pipedriveDealLink = `https://app.pipedrive.com/deal/${testDealId}`;
  proposal.status = "In bewerking";

  try {
    const result = await upsertProposalConcept(proposal, "advisor");

    return NextResponse.json({
      ok: true,
      reason: result.created ? "test_proposal_created" : "test_proposal_updated",
      dealId: testDealId,
      proposalId: result.proposal.id,
      storage: result.storage,
      ...env
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; stack?: string };
    return NextResponse.json(
      {
        ok: false,
        reason: "test_proposal_failed",
        error: {
          message: err.message ?? String(error),
          code: err.code,
          stack: err.stack
        },
        ...env
      },
      { status: 500 }
    );
  }
}
