import { NextResponse } from "next/server";
import { createNewProposalForDeal } from "@/lib/deal-proposal-loader";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireRequestSessionUser();
    const body = (await request.json()) as { dealId?: string };
    const dealId = body.dealId?.trim() ?? "";
    if (!dealId) {
      return NextResponse.json({ ok: false, error: "dealId ontbreekt." }, { status: 400 });
    }

    // Adviseur blijft metadata van Pipedrive/bestaande offerte — geen ownership-check meer.
    const proposal = await createNewProposalForDeal(dealId);
    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:for-deal] fout", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nieuwe offerte aanmaken mislukt." },
      { status: 500 }
    );
  }
}
