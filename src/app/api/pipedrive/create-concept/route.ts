import { NextResponse } from "next/server";
import { fetchPipedriveDealBundle, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { getProposalConceptByDealId, upsertProposalConcept } from "@/lib/proposal-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { dealId } = (await request.json()) as { dealId?: string };
    if (!dealId) {
      return NextResponse.json({ ok: false, error: "dealId ontbreekt." }, { status: 400 });
    }

    const existing = await getProposalConceptByDealId(dealId);
    if (existing) {
      return NextResponse.json({ ok: true, action: "existing", proposalId: existing.id });
    }

    if (!process.env.PIPEDRIVE_API_TOKEN) {
      return NextResponse.json({ ok: false, error: "PIPEDRIVE_API_TOKEN is niet ingesteld. Concept kan niet uit Pipedrive worden aangemaakt." }, { status: 500 });
    }

    console.info("[pipedrive:create-concept] start", { dealId });
    const bundle = await fetchPipedriveDealBundle(dealId);
    const proposal = await mapPipedriveBundleToProposal(dealId, bundle);
    const result = await upsertProposalConcept(proposal, "webhook");
    console.info("[pipedrive:create-concept] gelukt", { dealId, proposalId: result.proposal.id });

    return NextResponse.json({ ok: true, action: result.created ? "created" : "updated", proposalId: result.proposal.id });
  } catch (error) {
    console.error("[pipedrive:create-concept] fout", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Concept aanmaken mislukt." }, { status: 500 });
  }
}
