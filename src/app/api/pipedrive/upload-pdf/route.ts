import { NextResponse } from "next/server";
import { formatProposalPdfFilename } from "@/lib/proposal-engine";
import { renderProposalPdf } from "@/lib/pdf-renderer";
import { addDealNote, markDealOfferReady, moveDealToStage, uploadProposalPdf } from "@/lib/pipedrive";
import { isPipedriveDealId } from "@/lib/proposal-store-ids";
import { upsertProposalConcept } from "@/lib/proposal-store";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const proposal = (await request.json()) as Proposal;
    const dealId = proposal.customer.pipedriveDealId?.trim() ?? "";
    console.info("[pipedrive:upload-pdf] start", { dealId, proposalId: proposal.id });

    if (!isPipedriveDealId(dealId)) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige Pipedrive deal_id. Open deze offerte via een gekoppelde deal." },
        { status: 400 }
      );
    }

    if (!process.env.PIPEDRIVE_API_TOKEN) {
      console.info("[pipedrive:upload-pdf] demo mode: token ontbreekt", { dealId });
      return NextResponse.json({ ok: true, mode: "demo", message: "PIPEDRIVE_API_TOKEN ontbreekt; upload is gesimuleerd." });
    }

    const pdf = await renderProposalPdf(proposal);
    const filename = formatProposalPdfFilename(proposal);
    const fileResult = await uploadProposalPdf(proposal, new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);
    await addDealNote(dealId, "Definitieve offerte gegenereerd en toegevoegd.");
    const labelResult = await markDealOfferReady(dealId);

    const returnStageId = process.env.PIPEDRIVE_RETURN_STAGE_ID?.trim();
    let stageResult = null;
    if (returnStageId) {
      stageResult = await moveDealToStage(dealId, returnStageId);
    }

    await upsertProposalConcept({ ...proposal, status: "Geüpload naar Pipedrive" }, "upload");

    const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN?.trim();
    const dealUrl = domain ? `https://${domain}.pipedrive.com/deal/${dealId}` : `https://app.pipedrive.com/deal/${dealId}`;

    console.info("[pipedrive:upload-pdf] gelukt", { dealId, filename });
    return NextResponse.json({ ok: true, fileResult, labelResult, stageResult, dealUrl });
  } catch (error) {
    console.error("[pipedrive:upload-pdf] fout", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "PDF upload fout" }, { status: 500 });
  }
}
