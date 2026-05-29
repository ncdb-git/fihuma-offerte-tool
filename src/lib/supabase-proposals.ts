import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { isPipedriveDealId } from "@/lib/proposal-store-ids";
import { Proposal } from "@/lib/types";
import type { UpsertSource } from "@/lib/proposal-store-types";

/** Kolommen die de app naar public.proposals schrijft — moet 1:1 met SQL schema zijn. */
export const PROPOSALS_TABLE = "proposals";

export const PROPOSALS_COLUMNS = [
  "id",
  "pipedrive_deal_id",
  "proposal_id",
  "title",
  "status",
  "source",
  "advisor",
  "customer",
  "proposal_data",
  "pipedrive_deal_url",
  "created_at",
  "updated_at"
] as const;

export type ProposalsColumn = (typeof PROPOSALS_COLUMNS)[number];

export type SupabaseProposalRow = {
  id?: string;
  pipedrive_deal_id: string;
  proposal_id: string;
  title: string | null;
  status: string;
  source: string;
  advisor: Record<string, unknown>;
  customer: Record<string, unknown>;
  proposal_data: Proposal;
  pipedrive_deal_url: string | null;
  created_at?: string;
  updated_at: string;
};

export function supabaseClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export function supabaseEnv() {
  return {
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
    supabaseServiceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

/** Verwijdert undefined/NaN zodat jsonb en PostgREST geen 22P02/invalid input geven. */
export function sanitizeForJsonb<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v === undefined) return null;
      if (typeof v === "number" && Number.isNaN(v)) return null;
      return v;
    })
  ) as T;
}

export type PayloadValidationIssue = {
  field: string;
  issue: string;
};

export function validateSupabaseProposalPayload(payload: Record<string, unknown>): PayloadValidationIssue[] {
  const issues: PayloadValidationIssue[] = [];
  const allowed = new Set<string>(PROPOSALS_COLUMNS);

  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      issues.push({ field: key, issue: "kolom bestaat niet in Supabase schema" });
    }
  }

  for (const key of PROPOSALS_COLUMNS) {
    if (key === "id" || key === "created_at") continue;
    if (payload[key] === undefined) {
      issues.push({ field: key, issue: "undefined is niet toegestaan — gebruik null" });
    }
  }

  const checkJsonColumn = (field: "advisor" | "customer" | "proposal_data") => {
    const v = payload[field];
    if (v === null || v === undefined) return;
    if (typeof v !== "object" || Array.isArray(v)) {
      issues.push({ field, issue: "moet een object zijn (jsonb)" });
    }
  };

  checkJsonColumn("advisor");
  checkJsonColumn("customer");
  checkJsonColumn("proposal_data");

  const textFields: ProposalsColumn[] = ["pipedrive_deal_id", "proposal_id", "title", "status", "source", "pipedrive_deal_url"];
  for (const field of textFields) {
    const v = payload[field];
    if (v === null || v === undefined) continue;
    if (typeof v !== "string") {
      issues.push({ field, issue: "moet text zijn" });
      continue;
    }
    if (/€|m²|m2/i.test(v) && field !== "title") {
      issues.push({ field, issue: `text bevat valuta/eenheid — hoort in proposal_data: "${v}"` });
    }
  }

  if (payload.pipedrive_deal_id !== undefined && payload.pipedrive_deal_id === "") {
    issues.push({ field: "pipedrive_deal_id", issue: "mag niet leeg zijn" });
  }

  return issues;
}

/** Unieke sleutel voor Supabase — echte deals gebruiken deal_id, handmatige offertes `manual-{proposal_id}`. */
export function storagePipedriveDealId(proposal: Proposal): string {
  const dealId = proposal.customer.pipedriveDealId?.trim() ?? "";
  if (isPipedriveDealId(dealId)) return dealId;
  return `manual-${proposal.id}`;
}

export function isManualStorageDealId(pipedriveDealId: string) {
  return pipedriveDealId.startsWith("manual-");
}

export function buildSupabaseProposalPayload(
  proposal: Proposal,
  source: UpsertSource,
  existing?: { id: string; created_at: string } | null
): SupabaseProposalRow {
  const pipedriveDealId = storagePipedriveDealId(proposal);
  const proposalId = proposal.id;
  const now = new Date().toISOString();

  const payload: SupabaseProposalRow = {
    pipedrive_deal_id: pipedriveDealId,
    proposal_id: proposalId,
    title: proposal.title ?? null,
    status: normalizeProposalStatus(proposal.status),
    source,
    advisor: sanitizeForJsonb(proposal.advisor) as unknown as Record<string, unknown>,
    customer: sanitizeForJsonb(proposal.customer) as unknown as Record<string, unknown>,
    proposal_data: sanitizeForJsonb({ ...proposal, id: proposal.id, status: normalizeProposalStatus(proposal.status) }),
    pipedrive_deal_url: proposal.customer.pipedriveDealLink ?? null,
    updated_at: now
  };

  if (existing) {
    payload.id = existing.id;
  } else {
    payload.created_at = now;
  }

  return payload;
}

export function logSupabaseProposalPayload(payload: Record<string, unknown>) {
  console.log("SUPABASE PROPOSAL PAYLOAD", JSON.stringify(payload, null, 2));
}

export function logSupabaseError(error: unknown, payload: Record<string, unknown>) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error("SUPABASE ERROR", {
    code: err.code,
    message: err.message ?? String(error),
    details: err.details,
    hint: err.hint,
    payloadKeys: Object.keys(payload)
  });
}

export async function findProposalRowByDealId(client: SupabaseClient, dealId: string) {
  return client.from(PROPOSALS_TABLE).select("id, created_at, pipedrive_deal_id, proposal_id").eq("pipedrive_deal_id", dealId).maybeSingle();
}

export async function findProposalRowByLookupId(client: SupabaseClient, lookupId: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(lookupId)) {
    const byUuid = await client.from(PROPOSALS_TABLE).select("id, created_at, pipedrive_deal_id, proposal_id").eq("id", lookupId).maybeSingle();
    if (byUuid.data) return byUuid;
    if (byUuid.error) return byUuid;
  }

  const byProposalId = await client
    .from(PROPOSALS_TABLE)
    .select("id, created_at, pipedrive_deal_id, proposal_id")
    .eq("proposal_id", lookupId)
    .maybeSingle();
  if (byProposalId.data || byProposalId.error) return byProposalId;

  if (/^\d+$/.test(lookupId)) {
    return client.from(PROPOSALS_TABLE).select("id, created_at, pipedrive_deal_id, proposal_id").eq("pipedrive_deal_id", lookupId).maybeSingle();
  }

  return { data: null, error: null };
}
