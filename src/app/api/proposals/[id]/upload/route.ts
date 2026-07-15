import { NextResponse } from "next/server";
import { requireProposalAccess } from "@/lib/proposal-access";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireRequestSessionUser();
    const proposal = (await request.json()) as Proposal;
    requireProposalAccess(user, proposal);

    const origin = new URL(request.url).origin;
    const uploadResponse = await fetch(`${origin}/api/pipedrive/upload-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal)
    });
    const payload = await uploadResponse.json();
    return NextResponse.json(payload, { status: uploadResponse.status });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:upload] mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Upload mislukt" }, { status: 500 });
  }
}
