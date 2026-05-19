"use client";

import { Archive, Download, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/proposal-engine";
import { Proposal } from "@/lib/types";

type ProposalRecord = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
};

function proposalHref(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId;
  const isPipedriveConcept = dealId && dealId !== "demo" && !dealId.startsWith("manual-");
  return isPipedriveConcept ? `/create?deal_id=${dealId}` : `/create?id=${proposal.id}`;
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
  const [demoMode, setDemoMode] = useState(false);

  async function loadProposals() {
    setIsLoading(true);
    setError("");
    const response = await fetch("/api/proposals", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error ?? "Proposals ophalen mislukt.");
      setIsLoading(false);
      return;
    }
    setRecords(payload.data ?? []);
    setStorageMode(payload.storageMode ?? "");
    setDemoMode(Boolean(payload.demoMode));
    setIsLoading(false);
  }

  useEffect(() => {
    loadProposals();
  }, []);

  const hasRealRecords = useMemo(() => records.some((record) => !record.demo), [records]);

  async function archiveProposal(id: string) {
    const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" })
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Offertes</h1>
          <p className="mt-1 text-sm text-[#64736b]">
            {hasRealRecords
              ? `Echte opgeslagen offerteconcepten uit ${storageMode === "supabase" ? "Supabase" : "lokale storage"}.`
              : "Er zijn nog geen offerteconcepten. Zet een deal in Pipedrive op 'Offerte maken' of start handmatig een nieuwe offerte."}
          </p>
        </div>
        <button className="rounded-lg bg-fihuma-green px-4 py-3 text-sm font-bold text-white" onClick={() => router.push("/create")} type="button">
          Nieuwe offerte
        </button>
      </div>

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
        <button className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line bg-white font-bold">
          <SlidersHorizontal size={18} /> Filters
        </button>
      </div>

      {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-fihuma-line bg-white shadow-panel">
        <div className="grid grid-cols-[1.1fr_1fr_150px_130px_150px_120px] border-b border-fihuma-line bg-[#fbfcfa] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#64736b]">
          <span>Klant</span>
          <span>Adres</span>
          <span>Status</span>
          <span>Investering</span>
          <span>Bijgewerkt</span>
          <span>Acties</span>
        </div>

        {isLoading ? <div className="px-5 py-8 text-sm font-bold text-[#64736b]">Concepten laden...</div> : null}

        {!isLoading && records.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#64736b]">Er zijn nog geen offerteconcepten. Zet een deal in Pipedrive op ‘Offerte maken’ of start handmatig een nieuwe offerte.</div>
        ) : null}

        {!isLoading && demoMode && records.some((record) => record.demo) ? (
          <div className="border-b border-fihuma-line bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">Demo-offertes worden alleen getoond omdat DEMO_MODE=true actief is en er geen echte concepts zijn.</div>
        ) : null}

        {records.map((record) => {
          const { proposal } = record;
          const total = proposal.measures.reduce((sum, measure) => sum + measure.netInvestment, 0);
          const href = proposalHref(proposal);
          return (
            <div
              className="grid cursor-pointer grid-cols-[1.1fr_1fr_150px_130px_150px_120px] items-center border-b border-fihuma-line px-5 py-4 text-[#17221d] transition last:border-0 hover:bg-[#fbfcfa]"
              key={proposal.id}
              onClick={() => router.push(href)}
              role="button"
              tabIndex={0}
            >
              <div>
                <p className="font-black">{proposal.customer.name}</p>
                <p className="text-sm text-[#64736b]">{proposal.customer.pipedriveDealId ? `Pipedrive deal ${proposal.customer.pipedriveDealId}` : proposal.id}</p>
              </div>
              <p className="text-sm">
                {proposal.customer.address}, {proposal.customer.city}
              </p>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${record.demo ? "bg-[#ecefec] text-[#64736b]" : "bg-fihuma-mint text-fihuma-green"}`}>
                {record.demo ? "Demo" : proposal.status}
              </span>
              <strong>{money(total)}</strong>
              <span className="text-xs font-bold text-[#64736b]">{nlDateTime(record.updatedAt)}</span>
              <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                <button className="rounded-md border border-fihuma-line bg-white p-2" onClick={() => router.push(href)} title="Openen" type="button">
                  <Download size={17} />
                </button>
                {!record.demo ? (
                  <button className="rounded-md border border-fihuma-line bg-white p-2" onClick={() => archiveProposal(proposal.id)} title="Archiveren" type="button">
                    <Archive size={17} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
