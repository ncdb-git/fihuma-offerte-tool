"use client";

import { Archive, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/proposal-engine";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { Proposal } from "@/lib/types";

type ProposalRecord = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

function proposalHref(proposal: Proposal) {
  return `/create?deal_id=${proposal.customer.pipedriveDealId}`;
}

function nlDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DashboardClient() {
  const router = useRouter();
  const [records, setRecords] = useState<ProposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

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
        netTotal: record.proposal.measures.reduce((sum, measure) => sum + measure.netInvestment, 0),
        status: normalizeProposalStatus(record.proposal.status)
      })),
    [records]
  );

  async function archiveProposal(id: string) {
    const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Gearchiveerd" })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Archiveren mislukt.");
      return;
    }
    await loadProposals();
    router.refresh();
  }

  return (
    <section className="px-8 py-7">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Werkvoorraad</h1>
        <p className="mt-1 text-sm text-[#64736b]">Deals uit Pipedrive in stadium ‘Offerte maken’. Open een regel om verder te werken aan het concept.</p>
      </div>

      {persistenceWarning ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{persistenceWarning}</p>
      ) : null}

      <div className="mb-5 grid grid-cols-[1fr_170px_170px_120px] gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-fihuma-line bg-white px-3">
          <Search size={18} />
          <input className="h-11 w-full outline-none" placeholder="Zoeken op naam, straat of woonplaats" />
        </label>
        <select className="rounded-lg border border-fihuma-line bg-white px-3">
          <option>Alle adviseurs</option>
        </select>
        <select className="rounded-lg border border-fihuma-line bg-white px-3">
          <option>Actieve concepten</option>
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
            {records.length} deal{records.length === 1 ? "" : "s"} · opslag: {storageMode === "supabase" ? "Supabase" : "lokaal bestand"}
          </p>
        ) : null}

        {rows.map((record) => {
          const { proposal, netTotal, status } = record;
          const href = proposalHref(proposal);
          return (
            <div
              className="grid cursor-pointer grid-cols-[1.1fr_1fr_130px_130px_130px_150px_110px] items-center border-b border-fihuma-line px-5 py-4 text-[#17221d] transition last:border-0 hover:bg-[#fbfcfa]"
              key={proposal.id}
              onClick={() => router.push(href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") router.push(href);
              }}
              role="button"
              tabIndex={0}
            >
              <div>
                <p className="font-black">{proposal.customer.name}</p>
                <p className="text-sm text-[#64736b]">{proposal.customer.city || "—"}</p>
              </div>
              <p className="text-sm">
                {proposal.customer.address}
                {proposal.customer.city ? `, ${proposal.customer.city}` : ""}
              </p>
              <p className="text-sm text-[#64736b]">{proposal.advisor.name}</p>
              <span className="w-fit rounded-full bg-fihuma-mint px-3 py-1 text-xs font-black text-fihuma-green">{status}</span>
              <strong>{netTotal > 0 ? money(netTotal) : "—"}</strong>
              <span className="text-xs font-bold text-[#64736b]">{nlDateTime(record.updatedAt)}</span>
              <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                <button className="rounded-md border border-fihuma-line bg-white px-3 py-2 text-xs font-black" onClick={() => router.push(href)} title="Openen" type="button">
                  Openen
                </button>
                <button className="rounded-md border border-fihuma-line bg-white p-2" onClick={() => archiveProposal(proposal.id)} title="Archiveren" type="button">
                  <Archive size={17} />
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
    <div className="grid grid-cols-[1.1fr_1fr_130px_130px_130px_150px_110px] border-b border-fihuma-line bg-[#fbfcfa] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#64736b]">
      <span>Klant</span>
      <span>Adres</span>
      <span>Adviseur</span>
      <span>Status</span>
      <span>Netto</span>
      <span>Bijgewerkt</span>
      <span>Acties</span>
    </div>
  );
}
