import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "@/lib/auth-session";

export async function getRequestSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireRequestSessionUser(): Promise<SessionUser> {
  const user = await getRequestSessionUser();
  if (!user) throw new AuthRequiredError();
  return user;
}

export async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireRequestSessionUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export class AuthRequiredError extends Error {
  constructor(message = "Niet ingelogd") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Geen toegang") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function unauthorizedJson(message = "Niet ingelogd") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function forbiddenJson(message = "Geen toegang") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export function handleApiAuthError(error: unknown) {
  if (error instanceof AuthRequiredError) return unauthorizedJson(error.message);
  if (error instanceof ForbiddenError) return forbiddenJson(error.message);
  return null;
}
