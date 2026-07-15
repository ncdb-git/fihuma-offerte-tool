import { NextResponse } from "next/server";
import { requireProposalAccessById } from "@/lib/proposal-access";
import { deleteProposalConcept, duplicateProposalConcept, updateProposalStatus } from "@/lib/proposal-store";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRequestSessionUser();
    await requireProposalAccessById(user, params.id);
    await deleteProposalConcept(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[api:proposals] verwijderen mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Verwijderen mislukt" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRequestSessionUser();
    await requireProposalAccessById(user, params.id);

    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "duplicate") {
      const proposal = await duplicateProposalConcept(params.id);
      return NextResponse.json({ ok: true, proposal });
    }
    return NextResponse.json({ ok: false, error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[api:proposals] actie mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Actie mislukt" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRequestSessionUser();
    await requireProposalAccessById(user, params.id);

    const body = (await request.json()) as { status?: Proposal["status"] };
    if (!body.status) {
      return NextResponse.json({ ok: false, error: "Status ontbreekt." }, { status: 400 });
    }

    const proposal = await updateProposalStatus(params.id, body.status);
    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[api:proposals] status bijwerken mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Status bijwerken mislukt" }, { status: 500 });
  }
}
