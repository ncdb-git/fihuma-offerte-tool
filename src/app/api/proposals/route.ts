import { NextResponse } from "next/server";
import { listProposalRecords, proposalStorageMode } from "@/lib/proposal-store";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireRequestSessionUser();
    const dealId = new URL(request.url).searchParams.get("deal_id")?.trim() ?? "";
    const storageMode = proposalStorageMode();
    let records = await listProposalRecords({ pipedriveOnly: false, includeArchived: false });

    if (dealId) {
      records = records.filter((entry) => entry.proposal.customer.pipedriveDealId === dealId);
    }

    console.info("[api:proposals] dashboard fetch", {
      storageMode,
      count: records.length,
      role: user.role,
      email: user.email,
      proposal_ids: records.map((entry) => entry.proposal.id),
      pipedrive_deal_ids: records.map((entry) => entry.proposal.customer.pipedriveDealId ?? null)
    });

    return NextResponse.json({
      ok: true,
      storageMode,
      persistenceWarning:
        storageMode === "file"
          ? "Geen Supabase geconfigureerd: concepten worden lokaal opgeslagen in .data/proposal-concepts.json op deze server."
          : null,
      data: records
    });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;

    console.error("[api:proposals] ophalen mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Proposals ophalen mislukt" }, { status: 500 });
  }
}
