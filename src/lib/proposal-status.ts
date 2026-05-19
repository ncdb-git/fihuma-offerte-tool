import { ProposalStatus } from "@/lib/types";

export function normalizeProposalStatus(status: ProposalStatus): ProposalStatus {
  switch (status) {
    case "Concept vanuit Pipedrive":
    case "Bijgewerkt vanuit Pipedrive":
    case "nog te maken":
      return "Nieuw vanuit Pipedrive";
    case "concept":
      return "In bewerking";
    case "offerte gegenereerd":
      return "Offerte gegenereerd";
    case "verstuurd":
      return "Geüpload naar Pipedrive";
    case "archived":
    case "gearchiveerd":
      return "Gearchiveerd";
    default:
      return status;
  }
}

export function isArchivedStatus(status: ProposalStatus) {
  const normalized = normalizeProposalStatus(status);
  return normalized === "Gearchiveerd";
}
