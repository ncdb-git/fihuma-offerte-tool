import { advisors } from "@/lib/proposal-engine";
import type { Advisor } from "@/lib/types";

function normalizeEmail(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}

/** Koppelt Pipedrive owner e-mail aan een adviseurprofiel voor de offerte. */
export function resolveAdvisorFromEmail(ownerEmail: string): Advisor {
  const normalized = normalizeEmail(ownerEmail);
  if (!normalized) return advisors.find((item) => item.active) ?? advisors[0];

  const fromCatalog = advisors.find((item) => normalizeEmail(item.email) === normalized);
  if (fromCatalog) return fromCatalog;

  const localPart = normalized.split("@")[0] ?? "advisor";
  const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

  return {
    id: localPart.replace(/[^a-z0-9-]/g, "-"),
    name: displayName,
    email: normalized,
    phone: "",
    active: true
  };
}

export function advisorFromSessionUser(user: { email: string; name: string }): Advisor {
  return resolveAdvisorFromEmail(user.email);
}
