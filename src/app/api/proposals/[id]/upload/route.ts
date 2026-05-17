import { NextResponse } from "next/server";
import { uploadProposalPdf } from "@/lib/pipedrive";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const proposal = (await request.json()) as Proposal;

  if (!process.env.PIPEDRIVE_API_TOKEN) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      message: "PIPEDRIVE_API_TOKEN ontbreekt; upload is gesimuleerd."
    });
  }

  const origin = new URL(request.url).origin;
  const pdfResponse = await fetch(`${origin}/api/proposals/${proposal.id}/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proposal)
  });
  const pdf = await pdfResponse.blob();
  const result = await uploadProposalPdf(proposal, pdf);

  return NextResponse.json({ ok: true, result });
}
