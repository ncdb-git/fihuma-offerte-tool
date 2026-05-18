import { NextResponse } from "next/server";
import { Proposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const proposal = (await request.json()) as Proposal;
  const origin = new URL(request.url).origin;
  const uploadResponse = await fetch(`${origin}/api/pipedrive/upload-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proposal)
  });
  const payload = await uploadResponse.json();
  return NextResponse.json(payload, { status: uploadResponse.status });
}
