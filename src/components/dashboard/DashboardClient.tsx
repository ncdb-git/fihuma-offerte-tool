"use client";

import { Archive, Copy, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { advisors, money, proposalDashboardNetTotal, proposalDisplayTitle } from "@/lib/proposal-engine";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { isPipedriveDealId } from "@/lib/proposal-store-ids";
import { Proposal } from "@/lib/types";

type ProposalRecord = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

function proposalHref(proposal: Proposal) {
  if (isPipedriveDealId(proposal.customer.pipedriveDealId)) {
    return `/create?deal_id=${proposal.customer.pipedriveDealId}&proposal_id=${encodeURIComponent(proposal.id)}`;
  }
  return `/create?id=${encodeURIComponent(proposal.id)}`;
}

function nlDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DashboardClient() {
  const router = useRouter();
  const [records, setRecords] = useState<ProposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  async function loadProposals() {
    setIsLoading(true);
    setError("");
    const response = await fetch("/api/proposals", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error ?? "Werkvoorraad ophalen mislukt.");
      setIsLoading(false);
      return;
    }
    setRecords(payload.data ?? []);
    setStorageMode(payload.storageMode ?? "");
    setPersistenceWarning(payload.persistenceWarning ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadProposals();
  }, []);

  const rows = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        title: proposalDisplayTitle(record.proposal),
        netTotal: proposalDashboardNetTotal(record.proposal),
        status: normalizeProposalStatus(record.proposal.status)
      })),
    [records]
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((record) => {
      const { proposal, status } = record;
      const customer = proposal.customer;

      if (query) {
        const haystack = [customer.name, customer.address, customer.city, customer.postalCode, proposal.id, record.title]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (advisorFilter !== "all" && proposal.advisor.id !== advisorFilter) return false;

      if (statusFilter === "active") {
        if (status === "Gearchiveerd") return false;
      } else if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [rows, searchQuery, advisorFilter, statusFilter]);

  async function archiveProposal(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Gearchiveerd" })
    });
    setBusyId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Archiveren mislukt.");
      return;
    }
    await loadProposals();
    router.refresh();
  }

  async function deleteProposal(id: string) {
    if (!window.confirm("Conceptofferte definitief verwijderen?")) return;
    setBusyId(id);
    const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusyId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Verwijderen mislukt.");
      return;
    }
    await loadProposals();
  }

  async function duplicateProposal(record: ProposalRecord) {
    setBusyId(record.proposal.id);
    const response = await fetch(`/api/proposals/${encodeURIComponent(record.proposal.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" })
    });
    setBusyId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Dupliceren mislukt.");
      return;
    }
    const payload = await response.json();
    await loadProposals();
    if (payload.proposal) router.push(proposalHref(payload.proposal as Proposal));
  }

  return (
    <section className="px-8 py-7">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Werkvoorraad</h1>
        <p className="mt-1 text-sm text-[#64736b]">
          Alle conceptoffertes per klant. Meerdere offertes per deal zijn mogelijk (bijv. bodem, spouw, combinatie).
        </p>
      </div>

      {persistenceWarning ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{persistenceWarning}</p>
      ) : null}

      <div className="mb-5 grid grid-cols-[1fr_170px_170px_120px] gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-fihuma-line bg-white px-3">
          <Search size={18} />
          <input
            className="h-11 w-full outline-none"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Zoeken op naam, straat of woonplaats"
            value={searchQuery}
          />
        </label>
        <select
          className="rounded-lg border border-fihuma-line bg-white px-3"
          onChange={(event) => setAdvisorFilter(event.target.value)}
          value={advisorFilter}
        >
          <option value="all">Alle adviseurs</option>
          {advisors.map((advisor) => (
            <option key={advisor.id} value={advisor.id}>
              {advisor.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-fihuma-line bg-white px-3"
          onChange={(event) => setStatusFilter(event.target.value)}
          value={statusFilter}
        >
          <option value="active">Actieve concepten</option>
          <option value="all">Alle statussen</option>
          <option value="Nieuw vanuit Pipedrive">Nieuw vanuit Pipedrive</option>
          <option value="In bewerking">In bewerking</option>
          <option value="Offerte gegenereerd">Offerte gegenereerd</option>
          <option value="Geüpload naar Pipedrive">Geüpload naar Pipedrive</option>
          <option value="Gearchiveerd">Gearchiveerd</option>
        </select>
        <button className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line bg-white font-bold" type="button">
          <SlidersHorizontal size={18} /> Filters
        </button>
      </div>

      {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-fihuma-line bg-white shadow-panel">
        <TableHeader />

        {isLoading ? <div className="px-5 py-8 text-sm font-bold text-[#64736b]">Werkvoorraad laden...</div> : null}

        {!isLoading && records.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#64736b]">
            Er staan nog geen deals klaar. Zet een deal in Pipedrive op ‘Offerte maken’ om hier een offerte te starten.
          </div>
        ) : null}

        {!isLoading && records.length > 0 ? (
          <p className="border-b border-fihuma-line bg-[#fbfcfa] px-5 py-2 text-xs text-[#64736b]">
            {filteredRows.length} van {records.length} concept{records.length === 1 ? "" : "en"} · opslag:{" "}
            {storageMode === "supabase" ? "Supabase" : "lokaal bestand"}
          </p>
        ) : null}

        {!isLoading && records.length > 0 && filteredRows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[#64736b]">Geen concepten gevonden met deze filters.</div>
        ) : null}

        {filteredRows.map((record) => {
          const { proposal, netTotal, status, title } = record;
          const href = proposalHref(proposal);
          const disabled = busyId === proposal.id;
          return (
            <div
              className="grid cursor-pointer grid-cols-[1fr_1fr_120px_110px_110px_1.4fr] items-center border-b border-fihuma-line px-5 py-4 text-[#17221d] transition hover:bg-[#f7faf6] last:border-0"
              key={proposal.id}
              onClick={() => router.push(href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(href);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div>
                <p className="font-black">{proposal.customer.name}</p>
                <p className="text-sm text-[#64736b]">{proposal.customer.city || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-[#64736b]">{proposal.id}</p>
              </div>
              <span className="w-fit rounded-full bg-fihuma-mint px-3 py-1 text-xs font-black text-fihuma-green">{status}</span>
              <span className="text-xs font-bold text-[#64736b]">{nlDate(record.createdAt)}</span>
              <strong>{netTotal !== null ? money(netTotal) : "—"}</strong>
              <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                <button
                  className="rounded-md border border-fihuma-line bg-white px-2 py-1.5 text-[11px] font-black"
                  disabled={disabled}
                  onClick={() => router.push(href)}
                  type="button"
                >
                  Openen
                </button>
                <button
                  className="rounded-md border border-fihuma-line bg-white p-1.5"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    void duplicateProposal(record);
                  }}
                  title="Dupliceren"
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button
                  className="rounded-md border border-fihuma-line bg-white p-1.5"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    void archiveProposal(proposal.id);
                  }}
                  title="Archiveren"
                  type="button"
                >
                  <Archive size={15} />
                </button>
                <button
                  className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteProposal(proposal.id);
                  }}
                  title="Verwijderen"
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[1fr_1fr_120px_110px_110px_1.4fr] border-b border-fihuma-line bg-[#fbfcfa] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#64736b]">
      <span>Klant</span>
      <span>Conceptofferte</span>
      <span>Status</span>
      <span>Aangemaakt</span>
      <span>Netto</span>
      <span>Acties</span>
    </div>
  );
}
