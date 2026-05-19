import { NextResponse } from "next/server";
import { updateProposalStatus } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as { status?: Proposal["status"] };
    if (!body.status) {
      return NextResponse.json({ ok: false, error: "Status ontbreekt." }, { status: 400 });
    }

    const proposal = await updateProposalStatus(params.id, body.status);
    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    console.error("[api:proposals] status bijwerken mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Status bijwerken mislukt" }, { status: 500 });
  }
}
