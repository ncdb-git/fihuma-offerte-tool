import { NextResponse } from "next/server";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const proposal = (await request.json()) as Proposal;
    const result = await upsertProposalConcept(proposal);
    return NextResponse.json({ ok: true, proposalId: result.proposal.id, status: result.proposal.status, created: result.created });
  } catch (error) {
    console.error("[proposals:concepts] opslaan mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Concept opslaan mislukt" }, { status: 500 });
  }
}
