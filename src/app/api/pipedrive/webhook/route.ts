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

function serializeWebhookError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  if (typeof error === "object" && error !== null) {
    return error as Record<string, unknown>;
  }
  return { message: String(error) };
}

function logWebhookError(label: string, error: unknown, details?: Record<string, unknown>) {
  const base = serializeWebhookError(error);
  const extra = error as { code?: string; details?: string; hint?: string };

  console.error(
    `[pipedrive:webhook] ${label}`,
    JSON.stringify(
      {
        ...base,
        code: extra.code,
        details: extra.details,
        hint: extra.hint,
        ...details
      },
      null,
      2
    )
  );
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
    logWebhookError("ERROR", error, {
      ...env,
      expectedStageId: expected
    });

    const extra = error as { message?: string; code?: string; details?: string; hint?: string; stack?: string };
    const message = error instanceof Error ? error.message : extra.message ?? "Webhook fout";
    const stack = error instanceof Error ? error.stack : extra.stack;

    return NextResponse.json(
      {
        ok: false,
        reason: "error",
        error: { message, stack, code: extra.code, details: extra.details, hint: extra.hint },
        expectedStageId: expected,
        ...env
      },
      { status: 500 }
    );
  }
}
