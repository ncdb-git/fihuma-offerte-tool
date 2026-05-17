import { CheckCircle2, Pencil, Plus, Power } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppShell } from "@/components/dashboard/AppShell";
import { advisors } from "@/lib/proposal-engine";

export default function AdvisorsPage() {
  return (
    <AuthGate>
      <AppShell>
        <section className="px-8 py-7">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Adviseursbeheer</h1>
            <p className="mt-1 text-sm text-[#64736b]">Beheer adviseurs die in offertes geselecteerd kunnen worden.</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-fihuma-green px-4 py-3 text-sm font-bold text-white">
            <Plus size={18} /> Adviseur toevoegen
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-fihuma-line bg-white shadow-panel">
          <div className="grid grid-cols-[1fr_1fr_160px_120px] border-b border-fihuma-line bg-[#fbfcfa] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#64736b]">
            <span>Naam</span>
            <span>Contact</span>
            <span>Status</span>
            <span>Acties</span>
          </div>
          {advisors.map((advisor) => (
            <div className="grid grid-cols-[1fr_1fr_160px_120px] items-center border-b border-fihuma-line px-5 py-4 last:border-0" key={advisor.id}>
              <strong>{advisor.name}</strong>
              <div className="text-sm text-[#64736b]">
                <p>{advisor.email}</p>
                <p>{advisor.phone}</p>
              </div>
              <span className={`flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${advisor.active ? "bg-fihuma-mint text-fihuma-green" : "bg-[#ecefec] text-[#64736b]"}`}>
                {advisor.active ? <CheckCircle2 size={14} /> : <Power size={14} />}
                {advisor.active ? "actief" : "inactief"}
              </span>
              <div className="flex gap-2">
                <button className="rounded-md border border-fihuma-line p-2" title="Wijzigen">
                  <Pencil size={17} />
                </button>
                <button className="rounded-md border border-fihuma-line p-2" title="Deactiveren">
                  <Power size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
