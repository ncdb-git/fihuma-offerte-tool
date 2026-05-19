import { NextResponse } from "next/server";
import { PROPOSALS_COLUMNS, supabaseClient, supabaseEnv } from "@/lib/supabase-proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = supabaseEnv();
  const client = supabaseClient();

  if (!client) {
    return NextResponse.json({
      ok: false,
      reason: "supabase_not_configured",
      expectedColumns: PROPOSALS_COLUMNS,
      ...env
    });
  }

  const { data, error } = await client.from("proposals").select("*").limit(1);

  return NextResponse.json({
    ok: !error,
    reason: error ? "schema_probe_failed" : "schema_probe_ok",
    expectedColumns: PROPOSALS_COLUMNS,
    sampleRowKeys: data?.[0] ? Object.keys(data[0]) : [],
    error: error
      ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      : null,
    ...env,
    hint: "Vergelijk expectedColumns met sampleRowKeys. Ontbrekende keys = migration nog niet gedraaid."
  });
}
