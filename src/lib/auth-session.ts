export const SESSION_COOKIE = "fihuma_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type UserRole = "admin" | "advisor";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type SessionPayload = SessionUser & { exp: number };

function sessionSecret() {
  return process.env.SESSION_SECRET?.trim() ?? "";
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify"
  ]);
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

export async function createSessionToken(user: SessionUser, secret = sessionSecret()) {
  if (!secret) throw new Error("SESSION_SECRET ontbreekt in omgevingsvariabelen.");
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };
  const data = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null, secret = sessionSecret()): Promise<SessionUser | null> {
  if (!token || !secret) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), new TextEncoder().encode(data));
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(data))) as SessionPayload;
    if (!payload.id || !payload.email || !payload.role || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
  } catch {
    return null;
  }
}
