import { NextResponse } from "next/server";
import { buildCreateLoadTiming } from "@/lib/create-load-profiler";
import { bootstrapCreatePage, type CreateBootstrapParams } from "@/lib/create-bootstrap";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const wallStart = performance.now();
  try {
    const body = (await request.json()) as CreateBootstrapParams;
    const { result, profile } = await bootstrapCreatePage(body);
    const serverWallMs = Math.round(performance.now() - wallStart);
    const timing = body.debug ? buildCreateLoadTiming(profile, serverWallMs) : undefined;

    return NextResponse.json({
      ok: true,
      ...result,
      ...(body.debug ? { profile, timing } : {})
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configurator laden mislukt.";
    console.error("[create:bootstrap] fout", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
