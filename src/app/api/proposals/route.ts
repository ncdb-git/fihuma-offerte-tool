import { NextResponse } from "next/server";
import { demoProposals } from "@/lib/proposal-engine";
import { listProposalRecords, proposalStorageMode } from "@/lib/proposal-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const records = await listProposalRecords();
    const demoMode = process.env.DEMO_MODE === "true";
    const data =
      records.length > 0
        ? records
        : demoMode
          ? demoProposals.map((proposal) => ({ proposal, createdAt: proposal.createdAt, updatedAt: proposal.createdAt, demo: true }))
          : [];

    return NextResponse.json({
      ok: true,
      storageMode: proposalStorageMode(),
      demoMode,
      data
    });
  } catch (error) {
    console.error("[api:proposals] ophalen mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Proposals ophalen mislukt" }, { status: 500 });
  }
}
