import { createClient } from "@supabase/supabase-js";
import { Proposal } from "@/lib/types";

type StoredProposal = {
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
  return { proposal: next.proposal, created: !existing };
}

export async function listProposalConcepts() {
  const client = supabase();
  if (client) {
    const { data, error } = await client.from("proposals").select("proposal_data").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((entry) => entry.proposal_data as Proposal);
  }

  return Array.from(store().values()).map((entry) => entry.proposal);
}
