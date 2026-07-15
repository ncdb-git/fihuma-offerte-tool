import { NextResponse } from "next/server";
import { getRequestSessionUser, handleApiAuthError } from "@/lib/require-api-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getRequestSessionUser();
    if (!user) {
      return NextResponse.json({ ok: true, authenticated: false, user: null });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user
    });
  } catch (error) {
    const authResponse = handleApiAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: "Sessie ophalen mislukt." }, { status: 500 });
  }
}
