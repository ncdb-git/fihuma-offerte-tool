import { NextResponse } from "next/server";
import { buildCreateLoadTiming, runWithCreateLoadProfiler } from "@/lib/create-load-profiler";
import { requireProposalAccessById } from "@/lib/proposal-access";
import { refreshDealProposalFromPipedrive } from "@/lib/pipedrive-sync";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const wallStart = performance.now();
  try {
    const user = await requireRequestSessionUser();
    const body = (await request.json()) as {
      dealId?: string;
      proposalId?: string;
      force?: boolean;
      debug?: boolean;
    };
    const dealId = body.dealId?.trim() ?? "";
    const proposalId = body.proposalId?.trim() ?? "";
    if (!dealId || !proposalId) {
      return NextResponse.json({ ok: false, error: "dealId en proposalId zijn verplicht." }, { status: 400 });
    }

    const run = async () => {
      const existing = await requireProposalAccessById(user, proposalId);
      const { proposal, updated } = await refreshDealProposalFromPipedrive(dealId, existing, {
        force: body.force === true
      });
      return { ok: true as const, proposal, updated };
    };

    const { result, profile } = body.debug
      ? await runWithCreateLoadProfiler(run)
      : { result: await run(), profile: { pipedriveMs: 0, supabaseMs: 0, serverMs: 0, serverTotalMs: 0, spans: [] } };

    const serverWallMs = Math.round(performance.now() - wallStart);
    return NextResponse.json({
      ok: true,
      proposal: result.proposal,
      updated: result.updated,
      profile: body.debug ? profile : undefined,
      timing: body.debug ? buildCreateLoadTiming(profile, serverWallMs) : undefined
    });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "Pipedrive-verversen mislukt.";
    console.error("[create:refresh-pipedrive] fout", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
