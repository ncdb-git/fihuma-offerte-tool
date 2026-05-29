import { NextResponse } from "next/server";
import { createBlankManualProposal } from "@/lib/proposal-engine";
import { upsertProposalConcept } from "@/lib/proposal-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const proposal = createBlankManualProposal();
    const result = await upsertProposalConcept(proposal, "advisor");
    return NextResponse.json({
      ok: true,
      proposal: result.proposal,
      storageMode: result.storage.mode,
      persistenceWarning:
        result.storage.mode === "file"
          ? "Offerte opgeslagen in lokaal bestand op de server. Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY voor permanente opslag."
          : null
    });
  } catch (error) {
    console.error("[proposals:manual] fout", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Blanco offerte aanmaken mislukt." },
      { status: 500 }
    );
  }
}
