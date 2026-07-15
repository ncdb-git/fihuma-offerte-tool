import { NextResponse } from "next/server";
import { advisorFromSessionUser } from "@/lib/advisor-resolver";
import { createBlankManualProposal } from "@/lib/proposal-engine";
import { allocateProposalId, upsertProposalConcept } from "@/lib/proposal-store";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireRequestSessionUser();
    const newId = await allocateProposalId();
    const proposal = createBlankManualProposal(newId);
    proposal.advisor = advisorFromSessionUser(user);
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
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:manual] fout", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Blanco offerte aanmaken mislukt." },
      { status: 500 }
    );
  }
}
