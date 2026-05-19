import { NextResponse } from "next/server";
import { fetchPipedriveDealBundle, isTargetOfferStage, mapPipedriveBundleToProposal } from "@/lib/pipedrive";
import { proposalStorageMode, upsertProposalConcept } from "@/lib/proposal-store";

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

function expectedStageId() {
  return process.env.PIPEDRIVE_OFFERTE_STAGE_ID ?? null;
}

function storageEnv() {
  return {
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
    supabaseServiceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    storageMode: proposalStorageMode()
  };
}

function logWebhook(label: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[pipedrive:webhook] ${label}`, details);
    return;
  }
  console.info(`[pipedrive:webhook] ${label}`);
}

function logWebhookError(label: string, error: unknown, details?: Record<string, unknown>) {
  const payload =
    error instanceof Error
      ? { message: error.message, stack: error.stack, ...details }
      : { message: String(error), ...details };
  console.error(`[pipedrive:webhook] ${label}`, payload);
}

function formatStageId(stageId: unknown) {
  return stageId === undefined || stageId === null ? null : String(stageId);
}

export async function POST(request: Request) {
  const env = storageEnv();
  const expected = expectedStageId();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const dealId = payloadDealId(payload);
    const receivedStageId = formatStageId(payloadStageId(payload));
    const stageId = receivedStageId;

    console.log("CURRENT STAGE", stageId);
    console.log("EXPECTED STAGE", process.env.PIPEDRIVE_OFFERTE_STAGE_ID);

    const stageMatch = isTargetOfferStage(receivedStageId);

    logWebhook("WEBHOOK RECEIVED", {
      dealId: dealId || null,
      receivedStageId,
      expectedStageId: expected,
      stageMatch,
      ...env,
      body: payload
    });

    if (!isDealUpdate(payload) || !dealId) {
      logWebhook("IGNORED not_a_deal_update", { dealId: dealId || null });
      return NextResponse.json({
        ok: true,
        reason: "not_a_deal_update",
        dealId: dealId || null,
        ...env
      });
    }

    if (!stageMatch) {
      logWebhook("IGNORED stage_mismatch", {
        dealId,
        receivedStageId,
        expectedStageId: expected,
        stageMatch: false
      });
      return NextResponse.json({
        ok: false,
        reason: "stage_mismatch",
        dealId,
        receivedStageId,
        expectedStageId: expected,
        stageMatch: false,
        ...env
      });
    }

    logWebhook("FETCHING_PIPEDRIVE_DEAL", { dealId });
    const bundle = await fetchPipedriveDealBundle(dealId);
    const proposal = mapPipedriveBundleToProposal(dealId, bundle);

    logWebhook("UPSERT_STARTED", {
      dealId,
      proposalId: proposal.id,
      storageMode: env.storageMode,
      supabaseUrlPresent: env.supabaseUrlPresent,
      supabaseServiceRoleKeyPresent: env.supabaseServiceRoleKeyPresent
    });

    const result = await upsertProposalConcept(proposal, "webhook");
    const reason = result.created ? "concept_created" : "concept_updated";

    logWebhook("UPSERT_SUCCESS", {
      dealId,
      reason,
      proposalId: result.proposal.id,
      status: result.proposal.status,
      storage: result.storage
    });

    return NextResponse.json({
      ok: true,
      reason,
      dealId,
      proposalId: result.proposal.id,
      status: result.proposal.status,
      receivedStageId,
      expectedStageId: expected,
      stageMatch: true,
      storage: result.storage,
      ...env
    });
  } catch (error) {
    console.error("[pipedrive:webhook] ERROR", JSON.stringify(error, null, 2));

    logWebhookError("ERROR", error, {
      ...env,
      expectedStageId: expected
    });

    const message = error instanceof Error ? error.message : "Webhook fout";
    const stack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        ok: false,
        reason: "error",
        error: { message, stack },
        expectedStageId: expected,
        ...env
      },
      { status: 500 }
    );
  }
}
