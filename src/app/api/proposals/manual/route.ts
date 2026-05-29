import { NextResponse } from "next/server";
import { createBlankManualProposal } from "@/lib/proposal-engine";
import { upsertProposalConcept } from "@/lib/proposal-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const proposal = createBlankManualProposal();
    const result = await upsertProposalConcept(proposal, "advisor");
    return NextResponse.json({ ok: true, proposal: result.proposal });
  } catch (error) {
    console.error("[proposals:manual] fout", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Blanco offerte aanmaken mislukt." },
      { status: 500 }
    );
  }
}
