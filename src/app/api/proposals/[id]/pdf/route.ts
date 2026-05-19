import { NextResponse } from "next/server";
import { createDemoProposal, formatProposalPdfFilename } from "@/lib/proposal-engine";
import { renderProposalPdf } from "@/lib/pdf-renderer";
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const proposal = (await request.json()) as Proposal;
  const pdf = await renderProposalPdf(proposal);
  return pdfResponse(pdf, formatProposalPdfFilename(proposal));
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const proposal = createDemoProposal(params.id);
  const pdf = await renderProposalPdf(proposal);
  return pdfResponse(pdf, formatProposalPdfFilename(proposal));
}
