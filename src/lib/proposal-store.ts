import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { isArchivedStatus, normalizeProposalStatus } from "@/lib/proposal-status";
import { Proposal, ProposalStatus } from "@/lib/types";

export { normalizeProposalStatus } from "@/lib/proposal-status";

type StoredProposal = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

export type ProposalRecord = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

export type UpsertSource = "webhook" | "advisor" | "pdf" | "upload";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_STORE_PATH = path.join(DATA_DIR, "proposal-concepts.json");

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

function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export function proposalStorageMode() {
  return supabase() ? "supabase" : "file";
}

export function isPipedriveDealId(dealId: string) {
  return Boolean(dealId && dealId !== "demo" && !dealId.startsWith("manual-"));
}

export function pipedriveRecordId(dealId: string) {
  return `FIH-${dealId}`;
}

function storageKeyForProposal(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId;
  return isPipedriveDealId(dealId) ? dealId : proposal.id;
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
      pipedriveDealId: incoming.customer.pipedriveDealId || existing.customer.pipedriveDealId,
      pipedriveDealLink: incoming.customer.pipedriveDealLink || existing.customer.pipedriveDealLink
    },
    situation: {
      ...existing.situation,
      isolationTargets: incoming.situation.isolationTargets || existing.situation.isolationTargets
    }
  };
}

function resolveStatusOnUpsert(
  proposal: Proposal,
  existing: Proposal | null,
  source: UpsertSource
): ProposalStatus {
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
  const mode = proposalStorageMode();
  if (mode === "supabase") {
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
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = Object.fromEntries(map.entries());
  await fs.writeFile(FILE_STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
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
  return isPipedriveDealId(proposal.customer.pipedriveDealId);
}

export async function getProposalConceptByDealId(dealId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("proposals")
      .select("proposal_data")
      .eq("pipedrive_deal_id", dealId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const proposal = (data?.proposal_data as Proposal | undefined) ?? null;
    return proposal ? { ...proposal, status: normalizeProposalStatus(proposal.status) } : null;
  }

  const entry = (await getLocalStore()).get(dealId);
  return entry ? { ...entry.proposal, status: normalizeProposalStatus(entry.proposal.status) } : null;
}

export async function getProposalConceptById(id: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client.from("proposals").select("proposal_data").eq("id", id).maybeSingle();
    if (error) throw error;
    const proposal = (data?.proposal_data as Proposal | undefined) ?? null;
    return proposal ? { ...proposal, status: normalizeProposalStatus(proposal.status) } : null;
  }

  const map = await getLocalStore();
  const direct = map.get(id)?.proposal;
  if (direct) return { ...direct, status: normalizeProposalStatus(direct.status) };
  const found = Array.from(map.values()).find((entry) => entry.proposal.id === id);
  return found ? { ...found.proposal, status: normalizeProposalStatus(found.proposal.status) } : null;
}

export async function upsertProposalConcept(proposal: Proposal, source: UpsertSource = "advisor") {
  const dealId = proposal.customer.pipedriveDealId;
  const storageKey = storageKeyForProposal(proposal);
  const existingConcept = isPipedriveDealId(dealId)
    ? await getProposalConceptByDealId(dealId)
    : await getProposalConceptById(proposal.id);

  let nextProposal = { ...proposal, id: isPipedriveDealId(dealId) ? pipedriveRecordId(dealId) : proposal.id };

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

  const client = supabase();
  if (client) {
    const { data: existing, error: selectError } = isPipedriveDealId(dealId)
      ? await client.from("proposals").select("id, created_at").eq("pipedrive_deal_id", dealId).limit(1).maybeSingle()
      : await client.from("proposals").select("id, created_at").eq("id", storageKey).limit(1).maybeSingle();
    if (selectError) throw selectError;

    const now = new Date().toISOString();
    const row = {
      id: existing?.id ?? (isPipedriveDealId(dealId) ? pipedriveRecordId(dealId) : storageKey),
      status: nextProposal.status,
      label: nextProposal.label,
      customer: nextProposal.customer,
      advisor: nextProposal.advisor,
      proposal_data: nextProposal,
      pipedrive_deal_id: isPipedriveDealId(dealId) ? dealId : dealId || storageKey,
      pipedrive_deal_link: nextProposal.customer.pipedriveDealLink,
      updated_at: now,
      archived_at: isArchivedStatus(nextProposal.status) ? now : null
    };

    const { error: upsertError } = await client.from("proposals").upsert(row, { onConflict: "id" });
    if (upsertError) throw upsertError;

    console.info("[proposal-store] dashboard item saved", {
      storageMode: "supabase",
      proposalId: nextProposal.id,
      pipedriveDealId: dealId,
      status: nextProposal.status,
      created: !existing
    });
    return { proposal: nextProposal, created: !existing };
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

  console.info("[proposal-store] dashboard item saved", {
    storageMode: "file",
    proposalId: next.proposal.id,
    pipedriveDealId: dealId,
    status: next.proposal.status,
    created: !existing
  });

  return { proposal: next.proposal, created: !existing };
}

export async function listProposalRecords({ includeArchived = false, pipedriveOnly = true } = {}): Promise<ProposalRecord[]> {
  logStorageModeOnce();
  const client = supabase();

  if (client) {
    let query = client
      .from("proposals")
      .select("proposal_data, created_at, updated_at, status, pipedrive_deal_id, archived_at")
      .order("updated_at", { ascending: false });

    if (pipedriveOnly) {
      query = query.not("pipedrive_deal_id", "is", null).neq("pipedrive_deal_id", "").neq("pipedrive_deal_id", "demo");
    }

    if (!includeArchived) {
      query = query.is("archived_at", null).neq("status", "archived").neq("status", "gearchiveerd").neq("status", "Gearchiveerd");
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = (data ?? [])
      .map((entry) => ({
        proposal: { ...(entry.proposal_data as Proposal), status: normalizeProposalStatus((entry.proposal_data as Proposal).status) },
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      }))
      .filter((entry) => (pipedriveOnly ? isPipedriveRecord(entry.proposal) : true))
      .filter((entry) => includeArchived || !isArchivedStatus(entry.proposal.status));

    console.info("[proposal-store] dashboard fetch count", { storageMode: "supabase", count: records.length, pipedriveOnly, includeArchived });
    return records;
  }

  const records = Array.from((await getLocalStore()).values())
    .map(toRecord)
    .filter((entry) => (pipedriveOnly ? isPipedriveRecord(entry.proposal) : true))
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
  const client = supabase();

  if (client) {
    const { data, error: selectError } = await client.from("proposals").select("proposal_data").eq("id", id).maybeSingle();
    if (selectError) throw selectError;
    if (!data?.proposal_data) throw new Error(`Proposal ${id} niet gevonden`);

    const proposal = { ...(data.proposal_data as Proposal), status: normalized };
    const { error: updateError } = await client
      .from("proposals")
      .update({
        status: normalized,
        proposal_data: proposal,
        updated_at: new Date().toISOString(),
        archived_at: isArchivedStatus(normalized) ? new Date().toISOString() : null
      })
      .eq("id", id);
    if (updateError) throw updateError;

    console.info("[proposal-store] proposal status updated", { storageMode: "supabase", proposalId: id, status: normalized });
    return proposal;
  }

  const map = await getLocalStore();
  const entry =
    map.get(id) ??
    Array.from(map.values()).find((value) => value.proposal.id === id || pipedriveRecordId(value.proposal.customer.pipedriveDealId) === id);

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
