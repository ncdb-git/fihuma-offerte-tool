import { NextResponse } from "next/server";
import { listProposalRecords, proposalStorageMode } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const dealId = new URL(request.url).searchParams.get("deal_id")?.trim() ?? "";
    const storageMode = proposalStorageMode();
    let records = await listProposalRecords({ pipedriveOnly: true, includeArchived: false });

    if (dealId) {
      records = records.filter((entry) => entry.proposal.customer.pipedriveDealId === dealId);
    }

    console.info("[api:proposals] dashboard fetch", { storageMode, count: records.length });

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
    console.error("[api:proposals] ophalen mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Proposals ophalen mislukt" }, { status: 500 });
  }
}
