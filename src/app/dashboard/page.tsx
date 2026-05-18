import Link from "next/link";
import { Archive, Download, Search, Send, SlidersHorizontal } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppShell } from "@/components/dashboard/AppShell";
import { demoProposals, money } from "@/lib/proposal-engine";
import { listProposalConcepts } from "@/lib/proposal-store";

export default async function DashboardPage() {
  const storedProposals = await listProposalConcepts().catch((error) => {
    console.error("[dashboard] concepten ophalen mislukt", error);
    return [];
  });
  const storedDealIds = new Set(storedProposals.map((proposal) => proposal.customer.pipedriveDealId));
  const proposals = [...storedProposals, ...demoProposals.filter((proposal) => !storedDealIds.has(proposal.customer.pipedriveDealId))];

  return (
    <AuthGate>
      <AppShell>
        <section className="px-8 py-7">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Offertes</h1>
            <p className="mt-1 text-sm text-[#64736b]">Zoek, filter en beheer offertes vanuit een stabiele proposal engine.</p>
          </div>
          <Link className="rounded-lg bg-fihuma-green px-4 py-3 text-sm font-bold text-white" href="/create">
            Nieuwe offerte
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-[1fr_170px_170px_120px] gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-fihuma-line bg-white px-3">
            <Search size={18} />
            <input className="h-11 w-full outline-none" placeholder="Zoeken op naam, straat of woonplaats" />
          </label>
          <select className="rounded-lg border border-fihuma-line bg-white px-3">
            <option>Alle adviseurs</option>
            <option>Marco van Dijk</option>
            <option>Sanne de Groot</option>
          </select>
          <select className="rounded-lg border border-fihuma-line bg-white px-3">
            <option>Alle statussen</option>
            <option>concept</option>
            <option>verstuurd</option>
          </select>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line bg-white font-bold">
            <SlidersHorizontal size={18} /> Filters
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-fihuma-line bg-white shadow-panel">
          <div className="grid grid-cols-[1.2fr_1fr_150px_150px_130px] border-b border-fihuma-line bg-[#fbfcfa] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#64736b]">
            <span>Klant</span>
            <span>Adres</span>
            <span>Status</span>
            <span>Investering</span>
            <span>Acties</span>
          </div>
          {proposals.map((proposal) => {
            const total = proposal.measures.reduce((sum, measure) => sum + measure.netInvestment, 0);
            const isPipedriveConcept = proposal.customer.pipedriveDealId && proposal.customer.pipedriveDealId !== "demo" && !proposal.customer.pipedriveDealId.startsWith("manual-");
            const href = isPipedriveConcept ? `/create?deal_id=${proposal.customer.pipedriveDealId}` : `/create?id=${proposal.id}`;
            return (
              <div className="grid grid-cols-[1.2fr_1fr_150px_150px_130px] items-center border-b border-fihuma-line px-5 py-4 last:border-0" key={proposal.id}>
                <div>
                  <p className="font-black">{proposal.customer.name}</p>
                  <p className="text-sm text-[#64736b]">{proposal.id}</p>
                </div>
                <p className="text-sm">
                  {proposal.customer.address}, {proposal.customer.city}
                </p>
                <span className="w-fit rounded-full bg-fihuma-mint px-3 py-1 text-xs font-black text-fihuma-green">{proposal.status}</span>
                <strong>{money(total)}</strong>
                <div className="flex gap-2">
                  <Link className="rounded-md border border-fihuma-line p-2" href={href} title="Openen">
                    <Download size={17} />
                  </Link>
                  <button className="rounded-md border border-fihuma-line p-2" title="Versturen">
                    <Send size={17} />
                  </button>
                  <button className="rounded-md border border-fihuma-line p-2" title="Archiveren">
                    <Archive size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
