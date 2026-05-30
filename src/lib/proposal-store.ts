import "server-only";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isArchivedStatus, normalizeProposalStatus } from "@/lib/proposal-status";
import { generateProposalId, isPipedriveDealId, storageKeyForProposal } from "@/lib/proposal-store-ids";
import {
  finalizeProposalForStore,
  normalizeMeasure,
  sanitizeProposalCopy,
  stripLegacyDemoPricingFromProposal
} from "@/lib/proposal-engine";
import type { ProposalRecord, UpsertProposalResult, UpsertSource, UpsertStorageResult } from "@/lib/proposal-store-types";
import { Proposal, ProposalStatus } from "@/lib/types";
import {
  buildSupabaseProposalPayload,
  findProposalRowByDealId,
  findProposalRowByLookupId,
  formatSupabaseError,
  logSupabaseError,
  logSupabaseProposalPayload,
  PROPOSALS_TABLE,
  supabaseClient,
  validateSupabaseProposalPayload
} from "@/lib/supabase-proposals";

export { normalizeProposalStatus } from "@/lib/proposal-status";
export { generateProposalId, isPipedriveDealId, pipedriveRecordId } from "@/lib/proposal-store-ids";
export type { ProposalRecord, UpsertProposalResult, UpsertSource, UpsertStorageResult } from "@/lib/proposal-store-types";

type StoredProposal = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

function isServerlessRuntime() {
  const cwd = process.cwd();
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || cwd === "/var/task" || cwd.startsWith("/var/task/"));
}

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function resolveFileStorePath() {
  if (isServerlessRuntime()) {
    return path.join(os.tmpdir(), "fihuma-proposal-concepts.json");
  }
  return path.join(process.cwd(), ".data", "proposal-concepts.json");
}

const FILE_STORE_PATH = resolveFileStorePath();

const WORKFLOW_PRESERVE_STATUSES = new Set<ProposalStatus | string>([
  "In bewerking",
  "Offerte gegenereerd",
  "Geüpload naar Pipedrive",
  "offerte gegenereerd",
  "verstuurd",
  "concept"
]);

declare global {
  // eslint-disable-next-line no-var
  var fihumaProposalStoreLoaded: boolean | undefined;
  // eslint-disable-next-line no-var
  var fihumaProposalConcepts: Map<string, StoredProposal> | undefined;
}

let localStoreCache: Map<string, StoredProposal> | null = null;

export function proposalStorageMode() {
  if (supabaseClient()) return "supabase";
  return isServerlessRuntime() ? "ephemeral-file" : "file";
}

function shouldPreserveWorkflow(status: Proposal["status"]) {
  const normalized = normalizeProposalStatus(status);
  return WORKFLOW_PRESERVE_STATUSES.has(status) || WORKFLOW_PRESERVE_STATUSES.has(normalized);
}

function mergePipedriveRefresh(existing: Proposal, incoming: Proposal): Proposal {
  return {
    ...existing,
    advisor: incoming.advisor,
    customer: {
      ...existing.customer,
      ...incoming.customer,
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
      isolationTargets: incoming.situation.isolationTargets || existing.situation.isolationTargets
    }
  };
}

function resolveStatusOnUpsert(proposal: Proposal, existing: Proposal | null, source: UpsertSource): ProposalStatus {
  const dealId = proposal.customer.pipedriveDealId;
  if (!isPipedriveDealId(dealId)) {
    return normalizeProposalStatus(proposal.status || "In bewerking");
  }

  const current = existing ? normalizeProposalStatus(existing.status) : null;

  if (source === "webhook") {
    if (!existing) return "Nieuw vanuit Pipedrive";
    if (current && shouldPreserveWorkflow(existing.status)) return current;
    return "Nieuw vanuit Pipedrive";
  }

  if (source === "pdf") return "Offerte gegenereerd";
  if (source === "upload") return "Geüpload naar Pipedrive";

  const incoming = normalizeProposalStatus(proposal.status);
  if (incoming === "Gearchiveerd") return "Gearchiveerd";
  if (incoming === "Offerte gegenereerd" || incoming === "Geüpload naar Pipedrive") return incoming;
  if (current === "Offerte gegenereerd" || current === "Geüpload naar Pipedrive") return current;
  if (current === "Nieuw vanuit Pipedrive" || !current) return "In bewerking";
  return current ?? "In bewerking";
}

function logStorageModeOnce() {
  if (globalThis.fihumaProposalStoreLoaded) return;
  globalThis.fihumaProposalStoreLoaded = true;
  if (proposalStorageMode() === "supabase") {
    console.info("[proposal-store] storage mode: supabase (live persistence)");
    return;
  }
  console.warn(
    "[proposal-store] storage mode: file (.data/proposal-concepts.json). Supabase ontbreekt; webhook en dashboard delen dit bestand op dezelfde server."
  );
}

async function readFileStore(): Promise<Map<string, StoredProposal>> {
  try {
    const raw = await fs.readFile(FILE_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, StoredProposal>;
    return new Map(Object.entries(parsed));
  } catch {
    if (globalThis.fihumaProposalConcepts?.size) {
      return new Map(globalThis.fihumaProposalConcepts);
    }
    return new Map();
  }
}

async function writeFileStore(map: Map<string, StoredProposal>) {
  const filePath = resolveFileStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(Object.fromEntries(map.entries()), null, 2), "utf-8");
  globalThis.fihumaProposalConcepts = map;
}

async function getLocalStore() {
  logStorageModeOnce();
  if (!localStoreCache) {
    localStoreCache = await readFileStore();
    globalThis.fihumaProposalConcepts = localStoreCache;
  }
  return localStoreCache;
}

async function persistLocalStore(map: Map<string, StoredProposal>) {
  localStoreCache = map;
  await writeFileStore(map);
}

function toRecord(entry: StoredProposal): ProposalRecord {
  return {
    proposal: { ...entry.proposal, status: normalizeProposalStatus(entry.proposal.status) },
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function isPipedriveRecord(proposal: Proposal) {
  return isPipedriveDealId(proposal.customer.pipedriveDealId?.trim() ?? "");
}

function isStoredConceptRecord(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId?.trim() ?? "";
  return isPipedriveDealId(dealId) || dealId === "" || dealId.startsWith("manual-");
}

function proposalFromRow(proposalData: unknown): Proposal | null {
  if (!proposalData || typeof proposalData !== "object") return null;
  const proposal = sanitizeProposalCopy(stripLegacyDemoPricingFromProposal(proposalData as Proposal));
  return {
    ...proposal,
    status: normalizeProposalStatus(proposal.status),
    measures: (proposal.measures ?? []).map(normalizeMeasure),
    agreement: {
      paymentTerms: proposal.agreement?.paymentTerms ?? "",
      subsidyClause: proposal.agreement?.subsidyClause ?? "",
      nextSteps: proposal.agreement?.nextSteps ?? "",
      termsReference: proposal.agreement?.termsReference ?? "",
      approvalMethod: proposal.agreement?.approvalMethod ?? "digital",
      priorApprovalDate: proposal.agreement?.priorApprovalDate ?? null
    }
  };
}

async function upsertSupabaseProposal(proposal: Proposal, source: UpsertSource, existingConcept: Proposal | null) {
  const client = supabaseClient();
  if (!client) throw new Error("Supabase client niet beschikbaar");

  const dealId = proposal.customer.pipedriveDealId;
  const { data: existingRow, error: selectError } = await findProposalRowByLookupId(client, proposal.id);

  if (selectError && selectError.code !== "PGRST116") {
    logSupabaseError(selectError, {});
    throw new Error(formatSupabaseError(selectError));
  }

  const created = !existingRow;
  const payload = buildSupabaseProposalPayload(proposal, source, existingRow);
  const payloadRecord = { ...(payload as unknown as Record<string, unknown>) };

  const issues = validateSupabaseProposalPayload(payloadRecord);
  if (issues.length > 0) {
    console.error("[proposal-store] payload validation failed", issues);
    throw new Error(`Supabase payload ongeldig: ${issues.map((i) => `${i.field}: ${i.issue}`).join("; ")}`);
  }

  logSupabaseProposalPayload(payloadRecord);

  if (!existingRow?.id) {
    delete payloadRecord.id;
  }

  const { data: upserted, error: upsertError } = await client
    .from(PROPOSALS_TABLE)
    .upsert(payloadRecord, { onConflict: "proposal_id" })
    .select("id, pipedrive_deal_id, proposal_id, status")
    .maybeSingle();

  if (upsertError) {
    logSupabaseError(upsertError, payloadRecord);
    throw new Error(formatSupabaseError(upsertError));
  }

  const storage: UpsertStorageResult = {
    mode: "supabase",
    action: created ? "insert" : "update",
    recordId: upserted?.id ?? payload.id ?? "",
    pipedriveDealId: upserted?.pipedrive_deal_id ?? payload.pipedrive_deal_id,
    status: upserted?.status ?? payload.status
  };

  console.info("[proposal-store] dashboard item saved", {
    storageMode: "supabase",
    proposalId: proposal.id,
    pipedriveDealId: dealId,
    status: proposal.status,
    created,
    storage,
    hadExistingConcept: Boolean(existingConcept)
  });

  return { proposal, created, storage };
}

export async function listProposalsByDealId(dealId: string): Promise<ProposalRecord[]> {
  const client = supabaseClient();
  if (client) {
    const { data, error } = await client
      .from(PROPOSALS_TABLE)
      .select("proposal_data, created_at, updated_at, status")
      .eq("pipedrive_deal_id", dealId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError(error, { pipedrive_deal_id: dealId });
      throw error;
    }

    return (data ?? [])
      .map((entry) => {
        const proposal = proposalFromRow(entry.proposal_data);
        if (!proposal) return null;
        return { proposal, createdAt: entry.created_at as string, updatedAt: entry.updated_at as string };
      })
      .filter((entry): entry is ProposalRecord => Boolean(entry));
  }

  const map = await getLocalStore();
  return Array.from(map.values())
    .filter((entry) => entry.proposal.customer.pipedriveDealId === dealId)
    .map(toRecord)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Meest recente concept voor een deal (backward compatible). */
export async function getProposalConceptByDealId(dealId: string) {
  const records = await listProposalsByDealId(dealId);
  return records[0]?.proposal ?? null;
}

export async function getProposalConceptById(id: string) {
  const client = supabaseClient();
  if (client) {
    const { data: row, error } = await findProposalRowByLookupId(client, id);
    if (error) {
      logSupabaseError(error, { lookupId: id });
      throw error;
    }
    if (!row) return null;

    const { data, error: loadError } = await client.from(PROPOSALS_TABLE).select("proposal_data").eq("id", row.id).maybeSingle();
    if (loadError) {
      logSupabaseError(loadError, { id: row.id });
      throw loadError;
    }
    return proposalFromRow(data?.proposal_data);
  }

  const map = await getLocalStore();
  const direct = map.get(id)?.proposal;
  if (direct) return { ...direct, status: normalizeProposalStatus(direct.status) };
  const found = Array.from(map.values()).find((entry) => entry.proposal.id === id);
  return found ? { ...found.proposal, status: normalizeProposalStatus(found.proposal.status) } : null;
}

export async function upsertProposalConcept(proposal: Proposal, source: UpsertSource = "advisor"): Promise<UpsertProposalResult> {
  const dealId = proposal.customer.pipedriveDealId;
  const storageKey = storageKeyForProposal(proposal);
  const existingConcept = await getProposalConceptById(proposal.id);

  let nextProposal = finalizeProposalForStore({
    ...proposal,
    measures: proposal.measures.map(normalizeMeasure)
  });

  if (source === "webhook" && existingConcept && shouldPreserveWorkflow(existingConcept.status)) {
    nextProposal = mergePipedriveRefresh(existingConcept, nextProposal);
  }

  const status = resolveStatusOnUpsert(nextProposal, existingConcept, source);
  nextProposal = { ...nextProposal, status };

  console.info("[proposal-store] upsert dashboard item started", {
    storageMode: proposalStorageMode(),
    source,
    proposalId: nextProposal.id,
    pipedriveDealId: dealId,
    hasExisting: Boolean(existingConcept)
  });

  const client = supabaseClient();
  if (client) {
    try {
      return await upsertSupabaseProposal(nextProposal, source, existingConcept);
    } catch (error) {
      console.error("[proposal-store] Supabase upsert mislukt", error);
      if (isSupabaseConfigured()) {
        throw error instanceof Error ? error : new Error(formatSupabaseError(error));
      }
      console.warn("[proposal-store] Supabase niet geconfigureerd — fallback naar bestand");
    }
  }

  const map = await getLocalStore();
  const existing = map.get(storageKey);
  const now = new Date().toISOString();
  const next: StoredProposal = {
    proposal: nextProposal,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  map.set(storageKey, next);
  await persistLocalStore(map);

  const created = !existing;
  const storage: UpsertStorageResult = {
    mode: "file",
    action: created ? "insert" : "update",
    recordId: next.proposal.id,
    pipedriveDealId: dealId,
    status: next.proposal.status,
    filePath: resolveFileStorePath()
  };

  console.info("[proposal-store] dashboard item saved", {
    storageMode: "file",
    proposalId: next.proposal.id,
    pipedriveDealId: dealId,
    status: next.proposal.status,
    created,
    storage
  });

  return { proposal: next.proposal, created, storage };
}

export async function listProposalRecords({ includeArchived = false, pipedriveOnly = false } = {}): Promise<ProposalRecord[]> {
  logStorageModeOnce();
  const client = supabaseClient();

  if (client) {
    let query = client
      .from(PROPOSALS_TABLE)
      .select("proposal_data, created_at, updated_at, status, pipedrive_deal_id")
      .order("updated_at", { ascending: false });

    if (pipedriveOnly) {
      query = query.not("pipedrive_deal_id", "is", null).neq("pipedrive_deal_id", "").neq("pipedrive_deal_id", "demo").not(
        "pipedrive_deal_id",
        "like",
        "manual-%"
      );
    }

    if (!includeArchived) {
      query = query.neq("status", "Gearchiveerd").neq("status", "archived").neq("status", "gearchiveerd");
    }

    const { data, error } = await query;
    if (error) {
      logSupabaseError(error, {});
      throw error;
    }

    const records = (data ?? [])
      .map((entry) => {
        const proposal = proposalFromRow(entry.proposal_data);
        if (!proposal) return null;
        return {
          proposal,
          createdAt: entry.created_at as string,
          updatedAt: entry.updated_at as string
        };
      })
      .filter((entry): entry is ProposalRecord => Boolean(entry))
      .filter((entry) => (pipedriveOnly ? isPipedriveRecord(entry.proposal) : isStoredConceptRecord(entry.proposal)))
      .filter((entry) => includeArchived || !isArchivedStatus(entry.proposal.status));

    console.info("[proposal-store] dashboard fetch count", { storageMode: "supabase", count: records.length, pipedriveOnly, includeArchived });
    return records;
  }

  const records = Array.from((await getLocalStore()).values())
    .map(toRecord)
    .filter((entry) => (pipedriveOnly ? isPipedriveRecord(entry.proposal) : isStoredConceptRecord(entry.proposal)))
    .filter((entry) => includeArchived || !isArchivedStatus(entry.proposal.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  console.info("[proposal-store] dashboard fetch count", { storageMode: "file", count: records.length, pipedriveOnly, includeArchived });
  return records;
}

export async function listProposalConcepts() {
  return (await listProposalRecords()).map((entry) => entry.proposal);
}

export async function updateProposalStatus(id: string, status: Proposal["status"]) {
  const normalized = normalizeProposalStatus(status);
  const client = supabaseClient();

  if (client) {
    const { data: row, error: findError } = await findProposalRowByLookupId(client, id);
    if (findError) {
      logSupabaseError(findError, { lookupId: id });
      throw findError;
    }
    if (!row) throw new Error(`Proposal ${id} niet gevonden`);

    const { data, error: selectError } = await client.from(PROPOSALS_TABLE).select("proposal_data").eq("id", row.id).maybeSingle();
    if (selectError) {
      logSupabaseError(selectError, { id: row.id });
      throw selectError;
    }
    if (!data?.proposal_data) throw new Error(`Proposal ${id} niet gevonden`);

    const proposal = { ...(data.proposal_data as Proposal), status: normalized };
    const updatePayload = {
      status: normalized,
      proposal_data: proposal,
      updated_at: new Date().toISOString()
    };

    logSupabaseProposalPayload(updatePayload as unknown as Record<string, unknown>);

    const { error: updateError } = await client.from(PROPOSALS_TABLE).update(updatePayload).eq("id", row.id);
    if (updateError) {
      logSupabaseError(updateError, updatePayload as unknown as Record<string, unknown>);
      throw updateError;
    }

    console.info("[proposal-store] proposal status updated", { storageMode: "supabase", proposalId: id, status: normalized });
    return proposal;
  }

  const map = await getLocalStore();
  const entry =
    map.get(id) ??
    Array.from(map.values()).find((value) => value.proposal.id === id);

  if (!entry) throw new Error(`Proposal ${id} niet gevonden`);

  const next = {
    ...entry,
    proposal: { ...entry.proposal, status: normalized },
    updatedAt: new Date().toISOString()
  };
  map.set(storageKeyForProposal(next.proposal), next);
  await persistLocalStore(map);

  console.info("[proposal-store] proposal status updated", { storageMode: "file", proposalId: id, status: normalized });
  return next.proposal;
}

export async function deleteProposalConcept(id: string) {
  const client = supabaseClient();
  if (client) {
    const { data: row, error: findError } = await findProposalRowByLookupId(client, id);
    if (findError) throw findError;
    if (!row) throw new Error(`Proposal ${id} niet gevonden`);

    const { error } = await client.from(PROPOSALS_TABLE).delete().eq("id", row.id);
    if (error) throw error;
    return;
  }

  const map = await getLocalStore();
  const key = Array.from(map.entries()).find(
    ([, entry]) => entry.proposal.id === id || storageKeyForProposal(entry.proposal) === id
  )?.[0];
  if (!key) throw new Error(`Proposal ${id} niet gevonden`);
  map.delete(key);
  await persistLocalStore(map);
}

export async function duplicateProposalConcept(id: string): Promise<Proposal> {
  const existing = await getProposalConceptById(id);
  if (!existing) throw new Error(`Proposal ${id} niet gevonden`);

  const dealId = existing.customer.pipedriveDealId;
  const duplicate: Proposal = {
    ...existing,
    id: generateProposalId(dealId),
    status: "In bewerking",
    createdAt: new Date().toISOString(),
    title: `${existing.title} (kopie)`,
    measures: existing.measures.map((measure) => ({
      ...normalizeMeasure(measure),
      id: `${measure.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    }))
  };

  const result = await upsertProposalConcept(duplicate, "advisor");
  return result.proposal;
}
