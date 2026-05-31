import type { Proposal } from "@/lib/types";

const PIPEDRIVE_NEW_ID = /^FIH-(\d+)-(\d{2})$/;
const MANUAL_NEW_ID = /^FIH-MAN-(\d{4})-(\d{4})$/;

/** Leesbaar offertenummer voor UI/PDF — valt terug op proposal.id. */
export function proposalDisplayNumber(proposal: Pick<Proposal, "id" | "quoteNumber">) {
  const q = proposal.quoteNumber?.trim();
  if (q) return q;
  return proposal.id;
}

export function advisorFirstName(advisorName: string | undefined | null) {
  const trimmed = advisorName?.trim() ?? "";
  if (!trimmed) return "Adviseur onbekend";
  const first = trimmed.split(/\s+/)[0];
  return first || "Adviseur onbekend";
}

export function nextPipedriveProposalId(dealId: string, existingIds: string[]) {
  const normalizedDeal = dealId.trim();
  let maxSeq = 0;

  for (const id of existingIds) {
    const match = id.match(PIPEDRIVE_NEW_ID);
    if (match && match[1] === normalizedDeal) {
      maxSeq = Math.max(maxSeq, Number.parseInt(match[2], 10));
    }
  }

  const next = maxSeq + 1;
  if (next > 99) {
    throw new Error(`Maximaal 99 offertes per deal (${normalizedDeal}) bereikt.`);
  }

  return `FIH-${normalizedDeal}-${String(next).padStart(2, "0")}`;
}

export function nextManualProposalId(existingIds: string[]) {
  const year = new Date().getFullYear();
  let maxSeq = 0;

  for (const id of existingIds) {
    const match = id.match(MANUAL_NEW_ID);
    if (match && Number(match[1]) === year) {
      maxSeq = Math.max(maxSeq, Number.parseInt(match[2], 10));
    }
  }

  return `FIH-MAN-${year}-${String(maxSeq + 1).padStart(4, "0")}`;
}

export function isReadableProposalNumber(id: string) {
  return PIPEDRIVE_NEW_ID.test(id) || MANUAL_NEW_ID.test(id);
}
