import { NextResponse } from "next/server";
import { createDemoProposal } from "@/lib/proposal-engine";
import { fetchPipedriveCustomer } from "@/lib/pipedrive";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { dealId: string } }) {
  try {
    if (!process.env.PIPEDRIVE_API_TOKEN) {
      return NextResponse.json(createDemoProposal(params.dealId).customer);
    }

    const customer = await fetchPipedriveCustomer(params.dealId);
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pipedrive fout" }, { status: 502 });
  }
}
