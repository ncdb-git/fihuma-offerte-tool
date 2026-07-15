import type { SessionUser } from "@/lib/auth-session";
import type { Proposal } from "@/lib/types";

function normalizeEmail(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeName(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}

function firstName(value: string) {
  return value.split(/\s+/)[0] ?? "";
}

/** Bepaalt of een ingelogde gebruiker toegang heeft tot een offerte. */
export function userCanAccessProposal(user: SessionUser, proposal: Proposal) {
  if (user.role === "admin") return true;
  return proposalBelongsToAdvisor(user, proposal);
}

export function proposalBelongsToAdvisor(user: SessionUser, proposal: Proposal) {
  const advisorEmail = normalizeEmail(proposal.advisor?.email);
  const userEmail = normalizeEmail(user.email);

  if (advisorEmail && advisorEmail === userEmail) return true;

  if (!advisorEmail) {
    const advisorName = normalizeName(proposal.advisor?.name);
    const userName = normalizeName(user.name);
    if (advisorName && userName) {
      if (advisorName === userName) return true;
      if (firstName(advisorName) && firstName(advisorName) === firstName(userName)) return true;
    }
  }

  return false;
}

export function filterProposalsForUser<T extends { proposal: Proposal }>(user: SessionUser, records: T[]) {
  if (user.role === "admin") return records;
  return records.filter((record) => proposalBelongsToAdvisor(user, record.proposal));
}
