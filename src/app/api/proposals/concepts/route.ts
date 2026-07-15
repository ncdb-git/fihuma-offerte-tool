import { NextResponse } from "next/server";
import { advisorFromSessionUser } from "@/lib/advisor-resolver";
import { requireProposalAccess } from "@/lib/proposal-access";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";
import { Proposal, ProposalStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireRequestSessionUser();
    const body = (await request.json()) as Proposal & { source?: "advisor" | "pdf" | "upload"; status?: ProposalStatus };
    const { source = "advisor", ...proposal } = body;

    const existingId = proposal.id?.trim();
    if (existingId) {
      const { getProposalConceptById } = await import("@/lib/proposal-store");
      const existing = await getProposalConceptById(existingId);
      if (existing) {
        requireProposalAccess(user, existing);
      }
    }

    if (user.role === "advisor") {
      proposal.advisor = advisorFromSessionUser(user);
    }

    const result = await upsertProposalConcept(proposal, source);
    return NextResponse.json({ ok: true, proposalId: result.proposal.id, status: result.proposal.status, created: result.created });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:concepts] opslaan mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Concept opslaan mislukt" }, { status: 500 });
  }
}
