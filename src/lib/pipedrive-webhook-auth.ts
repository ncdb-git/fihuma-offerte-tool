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

export function readWebhookSecretFromRequest(request: Request) {
  const headerSecret = request.headers.get("x-webhook-secret")?.trim();
  if (headerSecret) return headerSecret;

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return null;
}

export function verifyPipedriveWebhookSecret(request: Request) {
  const expected = webhookSecretExpected();
  const provided = readWebhookSecretFromRequest(request);
  if (!expected || !provided) return false;
  return safeSecretCompare(provided, expected);
}
