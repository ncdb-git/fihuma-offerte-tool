import type { SessionUser } from "@/lib/auth-session";
import { advisors } from "@/lib/proposal-engine";
import type { Proposal } from "@/lib/types";

/**
 * Adviseur op een offerte is metadata (weergave/filter/rapportage), geen autorisatie.
 * Ingelogd = toegang tot alle offertes; niet-ingelogd wordt elders afgevangen.
 */
export function userCanAccessProposal(_user: SessionUser, _proposal: Proposal) {
  return true;
}

/** Alleen voor UI-filters: hoort deze offerte bij de geselecteerde adviseur. */
export function proposalMatchesAdvisorFilter(proposal: Proposal, advisorFilter: string) {
  if (advisorFilter === "all") return true;

  const email = proposal.advisor?.email?.trim().toLowerCase() ?? "";
  const name = proposal.advisor?.name?.trim() ?? "";
  const id = proposal.advisor?.id?.trim() ?? "";

  if (advisorFilter === "unknown") {
    if (!email && !name) return true;
    const known = advisors.some(
      (advisor) => (email && advisor.email.toLowerCase() === email) || (id && advisor.id === id)
    );
    return !known;
  }

  const selected = advisors.find((advisor) => advisor.id === advisorFilter);
  if (!selected) return id === advisorFilter;

  return id === selected.id || (email !== "" && email === selected.email.toLowerCase());
}

/** @deprecated Geen server-side visibility filter meer — API geeft alles terug. */
export function filterProposalsForUser<T extends { proposal: Proposal }>(_user: SessionUser, records: T[]) {
  return records;
}
