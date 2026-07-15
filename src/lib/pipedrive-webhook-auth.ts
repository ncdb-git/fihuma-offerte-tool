import "server-only";

import { timingSafeEqual } from "node:crypto";

function webhookSecretExpected() {
  return process.env.PIPEDRIVE_WEBHOOK_SECRET?.trim() ?? "";
}

function safeSecretCompare(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function secretsMatch(provided: string | null | undefined, expected: string) {
  if (!provided || !expected) return false;
  return safeSecretCompare(provided.trim(), expected);
}

/** Pipedrive stuurt Basic Auth als je HTTP username/password invult in de webhook-instellingen. */
function secretFromBasicAuth(authorization: string) {
  const encoded = authorization.slice("basic ".length).trim();
  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    // Accepteer secret als username OF als password (zo flexibel mogelijk in Pipedrive UI)
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return { username, password };
  } catch {
    return null;
  }
}

export function readWebhookSecretCandidates(request: Request) {
  const candidates: string[] = [];

  const headerSecret = request.headers.get("x-webhook-secret")?.trim();
  if (headerSecret) candidates.push(headerSecret);

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return candidates;

  if (authorization.toLowerCase().startsWith("bearer ")) {
    const bearer = authorization.slice("bearer ".length).trim();
    if (bearer) candidates.push(bearer);
    return candidates;
  }

  if (authorization.toLowerCase().startsWith("basic ")) {
    const basic = secretFromBasicAuth(authorization);
    if (basic?.username) candidates.push(basic.username);
    if (basic?.password) candidates.push(basic.password);
  }

  return candidates;
}

export function verifyPipedriveWebhookSecret(request: Request) {
  const expected = webhookSecretExpected();
  if (!expected) return false;

  return readWebhookSecretCandidates(request).some((candidate) => secretsMatch(candidate, expected));
}
