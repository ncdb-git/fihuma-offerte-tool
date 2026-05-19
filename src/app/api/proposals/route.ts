import { NextResponse } from "next/server";
import { listProposalRecords, proposalStorageMode } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const storageMode = proposalStorageMode();
    const records = await listProposalRecords({ pipedriveOnly: true, includeArchived: false });

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
