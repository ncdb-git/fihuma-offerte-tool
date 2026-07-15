import { NextResponse } from "next/server";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";
import { Proposal, ProposalStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireRequestSessionUser();
    const body = (await request.json()) as Proposal & { source?: "advisor" | "pdf" | "upload"; status?: ProposalStatus };
    const { source = "advisor", ...proposal } = body;

    // Advisor op de payload is metadata; niet overschrijven op basis van sessie.
    const result = await upsertProposalConcept(proposal, source);
    return NextResponse.json({ ok: true, proposalId: result.proposal.id, status: result.proposal.status, created: result.created });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:concepts] opslaan mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Concept opslaan mislukt" }, { status: 500 });
  }
}
