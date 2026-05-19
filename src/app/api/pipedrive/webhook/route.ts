import { NextResponse } from "next/server";
import { fetchPipedriveDealBundle, isTargetOfferStage, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { upsertProposalConcept } from "@/lib/proposal-store";

export const runtime = "nodejs";

function payloadDealId(payload: Record<string, unknown>) {
  const current = payload.current as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  return String(current?.id ?? data?.id ?? payload.deal_id ?? "");
}

function payloadStageId(payload: Record<string, unknown>) {
  const current = payload.current as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  return current?.stage_id ?? data?.stage_id;
}

function isDealUpdate(payload: Record<string, unknown>) {
  const meta = payload.meta as Record<string, unknown> | undefined;
  const entity = String(meta?.entity ?? meta?.object ?? payload.entity ?? payload.object ?? "").toLowerCase();
  const action = String(meta?.action ?? payload.action ?? "").toLowerCase();
  return entity === "deal" || action.includes("update") || Boolean(payloadDealId(payload));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const dealId = payloadDealId(payload);
    const stageId = payloadStageId(payload);

    console.info("[pipedrive:webhook] received deal_id", { dealId, stageId });

    if (!isDealUpdate(payload) || !dealId) {
      console.info("[pipedrive:webhook] genegeerd: geen deal update");
      return NextResponse.json({ ok: true, ignored: true, reason: "not_a_deal_update" });
    }

    if (!isTargetOfferStage(stageId)) {
      console.info("[pipedrive:webhook] genegeerd: stage mismatch", { dealId, stageId, target: process.env.PIPEDRIVE_OFFERTE_STAGE_ID });
      return NextResponse.json({ ok: true, ignored: true, reason: "stage_mismatch" });
    }

    const bundle = await fetchPipedriveDealBundle(dealId);
    const proposal = mapPipedriveBundleToProposal(dealId, bundle);
    const result = await upsertProposalConcept(proposal, "webhook");

    console.info(result.created ? "[pipedrive:webhook] dashboard item created" : "[pipedrive:webhook] dashboard item updated", {
      dealId,
      proposalId: result.proposal.id,
      status: result.proposal.status
    });

    return NextResponse.json({
      ok: true,
      dealId,
      proposalId: result.proposal.id,
      status: result.proposal.status,
      action: result.created ? "created" : "updated"
    });
  } catch (error) {
    console.error("[pipedrive:webhook] fout", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Webhook fout" }, { status: 500 });
  }
}
