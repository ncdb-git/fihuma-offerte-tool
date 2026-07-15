import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth-session";
import { findUserByEmail } from "@/lib/supabase-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "E-mailadres en wachtwoord zijn verplicht." }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ ok: false, error: "E-mailadres of wachtwoord is onjuist." }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth:login] mislukt", error);
    return NextResponse.json({ ok: false, error: "Inloggen mislukt." }, { status: 500 });
  }
}