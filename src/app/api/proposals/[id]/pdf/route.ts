import { NextResponse } from "next/server";
import { createDemoProposal, formatProposalPdfFilename } from "@/lib/proposal-engine";
import { prepareProposalWithSnapshot } from "@/lib/prepare-proposal-snapshot";
import { requireProposalAccess } from "@/lib/proposal-access";
import { renderProposalPdf } from "@/lib/pdf-renderer";
import { handleApiAuthError, requireRequestSessionUser } from "@/lib/require-api-auth";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function pdfResponse(pdf: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireRequestSessionUser();
    const proposal = (await request.json()) as Proposal;
    requireProposalAccess(user, proposal);
    const withSnapshot = await prepareProposalWithSnapshot(proposal, "pdf_generate");
    await upsertProposalConcept(withSnapshot, "pdf");
    const pdf = await renderProposalPdf(withSnapshot);
    return pdfResponse(pdf, formatProposalPdfFilename(withSnapshot));
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    console.error("[proposals:pdf] genereren mislukt", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "PDF genereren mislukt" }, { status: 500 });
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRequestSessionUser();
    const proposal = createDemoProposal(params.id);
    const pdf = await renderProposalPdf(proposal);
    return pdfResponse(pdf, formatProposalPdfFilename(proposal));
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: "PDF genereren mislukt" }, { status: 500 });
  }
}
