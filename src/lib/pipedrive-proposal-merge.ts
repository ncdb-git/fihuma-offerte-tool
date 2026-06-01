import { isMeasureDraft } from "@/lib/proposal-engine";
import type { Proposal } from "@/lib/types";

/** Vult lege klant-/adviseurvelden aan zonder bestaande adviseur-invoer te overschrijven. */
export function mergeAdvisorVisiblePipedriveFields(existing: Proposal, incoming: Proposal): Proposal {
  const merged: Proposal = {
    ...existing,
    advisor: incoming.advisor?.name ? incoming.advisor : existing.advisor,
    customer: {
      ...existing.customer,
      name: incoming.customer.name || existing.customer.name,
      email: incoming.customer.email || existing.customer.email,
      phone: incoming.customer.phone || existing.customer.phone,
      address: incoming.customer.address || existing.customer.address,
      postalCode: incoming.customer.postalCode || existing.customer.postalCode,
      city: incoming.customer.city || existing.customer.city,
      pipedriveDealId: incoming.customer.pipedriveDealId || existing.customer.pipedriveDealId,
      pipedriveDealLink: incoming.customer.pipedriveDealLink || existing.customer.pipedriveDealLink
    },
    situation: {
      ...existing.situation,
      isolationTargets: incoming.situation.isolationTargets || existing.situation.isolationTargets,
      summary: existing.situation.summary || incoming.situation.summary
    },
    pipedriveSyncedAt: incoming.pipedriveSyncedAt ?? existing.pipedriveSyncedAt
  };

  const measure = existing.measures[0];
  if (measure && isMeasureDraft(measure) && incoming.measures[0]) {
    return { ...merged, measures: incoming.measures };
  }

  return merged;
}
