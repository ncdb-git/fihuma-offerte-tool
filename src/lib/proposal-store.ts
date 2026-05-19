import { createClient } from "@supabase/supabase-js";
import { Proposal } from "@/lib/types";

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

declare global {
  // eslint-disable-next-line no-var
  var fihumaProposalConcepts: Map<string, StoredProposal> | undefined;
}

function store() {
  if (!globalThis.fihumaProposalConcepts) {
    globalThis.fihumaProposalConcepts = new Map();
  }
  return globalThis.fihumaProposalConcepts;
}

function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export function proposalStorageMode() {
  return supabase() ? "supabase" : "memory";
}

function isPipedriveDealId(dealId: string) {
  return Boolean(dealId && dealId !== "demo" && !dealId.startsWith("manual-"));
}

function storageKeyForProposal(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId;
  return isPipedriveDealId(dealId) ? dealId : proposal.id;
}

export async function getProposalConceptByDealId(dealId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client.from("proposals").select("proposal_data").eq("pipedrive_deal_id", dealId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return (data?.proposal_data as Proposal | undefined) ?? null;
  }

  return store().get(dealId)?.proposal ?? null;
}

export async function getProposalConceptById(id: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client.from("proposals").select("proposal_data").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data?.proposal_data as Proposal | undefined) ?? null;
  }

  return store().get(id)?.proposal ?? null;
}

export async function upsertProposalConcept(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId;
  const storageKey = storageKeyForProposal(proposal);
  const client = supabase();
  if (client) {
    const { data: existing, error: selectError } = isPipedriveDealId(dealId)
      ? await client.from("proposals").select("id, created_at").eq("pipedrive_deal_id", dealId).limit(1).maybeSingle()
      : await client.from("proposals").select("id, created_at").eq("id", storageKey).limit(1).maybeSingle();
    if (selectError) throw selectError;

    const nextProposal: Proposal = {
      ...proposal,
      status: isPipedriveDealId(dealId) ? (existing ? "Bijgewerkt vanuit Pipedrive" : "Concept vanuit Pipedrive") : "concept"
    };
    const now = new Date().toISOString();
    const row = {
      id: existing?.id ?? storageKey,
      status: nextProposal.status,
      label: nextProposal.label,
      customer: nextProposal.customer,
      advisor: nextProposal.advisor,
      proposal_data: nextProposal,
      pipedrive_deal_id: dealId,
      pipedrive_deal_link: nextProposal.customer.pipedriveDealLink,
      updated_at: now
    };

    const { error: upsertError } = await client.from("proposals").upsert(row, { onConflict: "id" });
    if (upsertError) throw upsertError;
    console.info("[proposal-store] proposal saved", { storageMode: "supabase", proposalId: nextProposal.id, pipedriveDealId: dealId, status: nextProposal.status });
    return { proposal: nextProposal, created: !existing };
  }

  const existing = store().get(storageKey);
  const now = new Date().toISOString();
  const next: StoredProposal = {
    proposal: {
      ...proposal,
      status: isPipedriveDealId(dealId) ? (existing ? "Bijgewerkt vanuit Pipedrive" : "Concept vanuit Pipedrive") : "concept"
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  store().set(storageKey, next);
  console.info("[proposal-store] proposal saved", { storageMode: "memory", proposalId: next.proposal.id, pipedriveDealId: dealId, status: next.proposal.status });
  return { proposal: next.proposal, created: !existing };
}

export async function listProposalRecords({ includeArchived = false } = {}): Promise<ProposalRecord[]> {
  const client = supabase();
  if (client) {
    let query = client.from("proposals").select("proposal_data, created_at, updated_at, status").order("updated_at", { ascending: false });
    if (!includeArchived) query = query.neq("status", "archived").neq("status", "gearchiveerd");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((entry) => ({
      proposal: entry.proposal_data as Proposal,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at
    }));
  }

  return Array.from(store().values())
    .filter((entry) => includeArchived || (entry.proposal.status !== "archived" && entry.proposal.status !== "gearchiveerd"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((entry) => ({ proposal: entry.proposal, createdAt: entry.createdAt, updatedAt: entry.updatedAt }));
}

export async function listProposalConcepts() {
  return (await listProposalRecords()).map((entry) => entry.proposal);
}

export async function updateProposalStatus(id: string, status: Proposal["status"]) {
  const client = supabase();
  if (client) {
    const { data, error: selectError } = await client.from("proposals").select("proposal_data").eq("id", id).maybeSingle();
    if (selectError) throw selectError;
    if (!data?.proposal_data) throw new Error(`Proposal ${id} niet gevonden`);
    const proposal = { ...(data.proposal_data as Proposal), status };
    const { error: updateError } = await client
      .from("proposals")
      .update({ status, proposal_data: proposal, updated_at: new Date().toISOString(), archived_at: status === "archived" ? new Date().toISOString() : null })
      .eq("id", id);
    if (updateError) throw updateError;
    console.info("[proposal-store] proposal status updated", { storageMode: "supabase", proposalId: id, status });
    return proposal;
  }

  const entry = store().get(id) ?? Array.from(store().values()).find((value) => value.proposal.id === id);
  if (!entry) throw new Error(`Proposal ${id} niet gevonden`);
  const next = { ...entry, proposal: { ...entry.proposal, status }, updatedAt: new Date().toISOString() };
  store().set(storageKeyForProposal(next.proposal), next);
  console.info("[proposal-store] proposal status updated", { storageMode: "memory", proposalId: id, status });
  return next.proposal;
}
