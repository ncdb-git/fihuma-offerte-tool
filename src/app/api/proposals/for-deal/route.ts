import { NextResponse } from "next/server";
import { advisorFromSessionUser } from "@/lib/advisor-resolver";
import { userCanAccessProposal } from "@/lib/auth-proposals";
import { createNewProposalForDeal } from "@/lib/deal-proposal-loader";
import { listProposalsByDealId } from "@/lib/proposal-store";
import { ForbiddenError, handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireRequestSessionUser();
    const body = (await request.json()) as { dealId?: string };
    const dealId = body.dealId?.trim() ?? "";
    if (!dealId) {
      return NextResponse.json({ ok: false, error: "dealId ontbreekt." }, { status: 400 });
    }

    if (user.role !== "admin") {
      const siblings = await listProposalsByDealId(dealId);
      if (siblings.length > 0 && !siblings.some((entry) => userCanAccessProposal(user, entry.proposal))) {
        throw new ForbiddenError("Je hebt geen toegang tot offertes voor deze deal.");
      }
    }

    const proposal = await createNewProposalForDeal(
      dealId,
      user.role === "admin" ? undefined : { advisor: advisorFromSessionUser(user) }
    );
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
