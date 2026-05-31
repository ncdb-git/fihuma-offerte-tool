"use client";

import { Archive, ChevronDown, ChevronRight, Copy, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { groupDashboardProposals, isManualGroup, type DashboardCustomerGroup, type DashboardProposalRow } from "@/lib/dashboard-groups";
import { progressToneClasses } from "@/lib/proposal-configurator-progress";
import { advisors } from "@/lib/proposal-engine";
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

function formatRelativeNl(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (dayDiff === 0) return "vandaag";
  if (dayDiff === 1) return "gisteren";
  return nlDate(iso);
}

function addressSummary(group: DashboardCustomerGroup) {
  const parts = [group.addressLine !== "—" ? group.addressLine : "", group.city !== "—" ? group.city : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function DashboardClient() {
  const router = useRouter();
  const [records, setRecords] = useState<ProposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    setPersistenceWarning(payload.persistenceWarning ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProposals();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return records.filter((record) => {
      const { proposal } = record;
      const customer = proposal.customer;
      const status = normalizeProposalStatus(proposal.status);

      if (query) {
        const haystack = [
          customer.name,
          customer.address,
          customer.city,
          customer.postalCode,
          proposal.id,
          proposal.quoteNumber,
          proposal.advisor?.name,
          proposal.measures[0]?.type
        ]
          .filter(Boolean)
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
  }, [records, searchQuery, advisorFilter, statusFilter]);

  const customerGroups = useMemo(() => groupDashboardProposals(filteredRecords), [filteredRecords]);

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

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

  async function duplicateProposal(proposalId: string) {
    setBusyId(proposalId);
    const response = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}`, {
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

  async function createNewForDeal(dealId: string) {
    setBusyId(`new-${dealId}`);
    setError("");
    const response = await fetch("/api/proposals/for-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId })
    });
    setBusyId(null);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Nieuwe offerte aanmaken mislukt.");
      return;
    }
    if (payload.proposal) {
      router.push(proposalHref(payload.proposal as Proposal));
      return;
    }
    await loadProposals();
  }

  return (
    <section className="px-8 py-7">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Werkvoorraad</h1>
        <p className="mt-1 text-sm text-[#64736b]">
          Gegroepeerd per klant/deal. Meerdere conceptoffertes onder één klant (bijv. vloer, bodem, spouw).
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
            placeholder="Zoeken op naam, straat, offertenummer…"
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
        {isLoading ? <div className="px-5 py-8 text-sm font-bold text-[#64736b]">Werkvoorraad laden...</div> : null}

        {!isLoading && records.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#64736b]">
            Er staan nog geen deals klaar. Zet een deal in Pipedrive op ‘Offerte maken’ om hier een offerte te starten.
          </div>
        ) : null}

        {!isLoading && records.length > 0 && customerGroups.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[#64736b]">Geen concepten gevonden met deze filters.</div>
        ) : null}

        {customerGroups.map((group) => (
          <CustomerGroupAccordion
            busyId={busyId}
            expanded={expandedGroups.has(group.groupKey)}
            group={group}
            key={group.groupKey}
            onArchive={archiveProposal}
            onCreateNew={
              group.pipedriveDealId
                ? () => void createNewForDeal(group.pipedriveDealId!)
                : () => router.push("/create?manual=1")
            }
            onDelete={deleteProposal}
            onDuplicate={duplicateProposal}
            onOpenFirst={() => {
              const first = group.proposals[0];
              if (first) router.push(proposalHref(first.proposal));
            }}
            onToggle={() => toggleGroup(group.groupKey)}
          />
        ))}
      </div>
    </section>
  );
}

type CustomerGroupAccordionProps = {
  group: DashboardCustomerGroup;
  expanded: boolean;
  busyId: string | null;
  onToggle: () => void;
  onOpenFirst: () => void;
  onCreateNew?: () => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

function ConceptOfferRow({
  row,
  busyId,
  onDuplicate,
  onArchive,
  onDelete
}: {
  row: DashboardProposalRow;
  busyId: string | null;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const href = proposalHref(row.proposal);
  const disabled = busyId === row.proposal.id;
  const { concept } = row;
  const tone = progressToneClasses(concept.progress.tone);

  const metaParts = [concept.squareMetersLabel, concept.productName, concept.amountLabel].filter(Boolean);

  return (
    <div className="grid gap-3 rounded-lg border border-fihuma-line bg-white px-4 py-3 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="text-base font-black leading-tight text-[#17221d]">{concept.measureTypeLabel}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-fihuma-line bg-[#f4f7f5] px-2.5 py-1 text-xs font-black text-[#17221d]">
            {row.status}
          </span>
          <span className={`rounded-md border px-2.5 py-1 text-xs font-black ${tone.badge}`}>
            {concept.progress.emoji} {concept.progress.label}
            <span className="ml-1.5 font-semibold opacity-90">
              · {concept.progress.completedSteps}/{concept.progress.totalSteps}
            </span>
          </span>
        </div>

        <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[#eef2ed]">
          <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${concept.progress.percent}%` }} />
        </div>
        <p className="mt-1 text-[11px] font-medium text-[#64736b]">
          {concept.progress.completedSteps} van {concept.progress.totalSteps} stappen voltooid
        </p>

        {metaParts.length > 0 ? (
          <p className="mt-2 text-xs font-medium text-[#8a9690]">
            {metaParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {index > 0 ? <span className="mx-1.5 text-[#c5cdc8]">•</span> : null}
                {part}
              </span>
            ))}
          </p>
        ) : null}

        <p className="mt-1.5 text-[11px] text-[#a3afa8]">
          {row.displayNumber} · Adviseur: {row.advisorLabel} · Aangemaakt {nlDate(row.createdAt)} · Bijgewerkt{" "}
          {formatRelativeNl(row.updatedAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-1.5 lg:justify-end">
        <button
          className="rounded-md border border-fihuma-line bg-white px-2 py-1.5 text-[11px] font-black"
          disabled={disabled}
          onClick={() => router.push(href)}
          type="button"
        >
          Openen
        </button>
        <button
          className="rounded-md border border-fihuma-line bg-white px-2 py-1.5 text-[11px] font-black"
          disabled={disabled}
          onClick={() => router.push(href)}
          type="button"
        >
          Bewerken
        </button>
        <button
          className="rounded-md border border-fihuma-line bg-white p-1.5"
          disabled={disabled}
          onClick={() => onDuplicate(row.proposal.id)}
          title="Dupliceren"
          type="button"
        >
          <Copy size={15} />
        </button>
        <button
          className="rounded-md border border-fihuma-line bg-white p-1.5"
          disabled={disabled}
          onClick={() => onArchive(row.proposal.id)}
          title="Archiveren"
          type="button"
        >
          <Archive size={15} />
        </button>
        <button
          className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700"
          disabled={disabled}
          onClick={() => onDelete(row.proposal.id)}
          title="Verwijderen"
          type="button"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function CustomerGroupAccordion({
  group,
  expanded,
  busyId,
  onToggle,
  onOpenFirst,
  onCreateNew,
  onDuplicate,
  onArchive,
  onDelete
}: CustomerGroupAccordionProps) {
  const router = useRouter();
  const conceptLabel = `${group.conceptCount} conceptofferte${group.conceptCount === 1 ? "" : "s"}`;
  const manual = isManualGroup(group);

  return (
    <article className="border-b border-fihuma-line last:border-0">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-[#f7faf6]">
        <button
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          onClick={onToggle}
          type="button"
        >
          {expanded ? <ChevronDown className="mt-0.5 shrink-0 text-fihuma-green" size={18} /> : <ChevronRight className="mt-0.5 shrink-0 text-[#64736b]" size={18} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-[#17221d]">
              {group.customerName}
              <span className="font-bold text-[#64736b]"> · {addressSummary(group)}</span>
            </p>
            <p className="mt-0.5 text-xs text-[#64736b]">
              {conceptLabel} · Laatst gewijzigd {formatRelativeNl(group.lastUpdatedAt)} · Adviseur: {group.advisorFirstName}
              {manual ? " · Handmatig" : group.pipedriveDealId ? ` · Deal ${group.pipedriveDealId}` : null}
            </p>
            <p className="mt-1 text-xs font-semibold text-fihuma-green">{group.statusSummary}</p>
          </div>
        </button>

        <div className="flex flex-wrap gap-1.5">
          <button
            className="rounded-md border border-fihuma-line bg-white px-2.5 py-1.5 text-[11px] font-black"
            onClick={onOpenFirst}
            type="button"
          >
            Open klant
          </button>
          {onCreateNew ? (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-fihuma-green bg-fihuma-mint px-2.5 py-1.5 text-[11px] font-black text-fihuma-green"
              disabled={busyId === `new-${group.pipedriveDealId}`}
              onClick={onCreateNew}
              type="button"
            >
              <Plus size={14} /> Nieuwe offerte
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-fihuma-line bg-[#fbfcfa] px-5 py-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#64736b]">Conceptoffertes</p>
          <div className="space-y-2">
            {group.proposals.map((row) => (
              <ConceptOfferRow
                busyId={busyId}
                key={row.proposal.id}
                onArchive={onArchive}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                row={row}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
