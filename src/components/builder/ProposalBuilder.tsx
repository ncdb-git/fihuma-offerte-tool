"use client";

import { ArrowLeft, Check, ChevronRight, FileDown, LogOut, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfiguratorSummary } from "@/components/builder/ConfiguratorSummary";
import { MeerwerkPanel } from "@/components/builder/MeerwerkPanel";
import { ProposalDocument } from "@/components/proposal/ProposalDocument";
import { AUTH_STORAGE_KEY } from "@/lib/auth";
import {
  advisors,
  applyProductToMeasure,
  buildModuleExtraWork,
  calculateIsdeSubsidy,
  calculateNetInvestment,
  configuratorSubsidies,
  createBlankMeasure,
  defaultModules,
  formatProposalPdfFilename,
  getProductKeyForMeasure,
  ISDE_SUBSIDY_STATUS_OPTIONS,
  isolationLabelForType,
  MAIN_PRODUCTS,
  measureBrutoTotal,
  measureExtraWorkTotal,
  MEASURE_TYPE_LABELS,
  money,
  PAYMENT_TERM_OPTIONS,
  SUBSIDY_CLAUSE_OPTIONS,
  type BuilderModules
} from "@/lib/proposal-engine";
import { Measure, MeasureType, Proposal, Salutation } from "@/lib/types";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "Start" },
  { id: 2, label: "Klant" },
  { id: 3, label: "Maatregel" },
  { id: 4, label: "Product" },
  { id: 5, label: "Investering" },
  { id: 6, label: "Klaar" }
] as const;

const TYPE_CARDS: { type: MeasureType; label: string }[] = [
  { type: "spouwmuur", label: MEASURE_TYPE_LABELS.spouwmuur },
  { type: "vloer", label: MEASURE_TYPE_LABELS.vloer },
  { type: "bodem", label: MEASURE_TYPE_LABELS.bodem },
  { type: "dak", label: MEASURE_TYPE_LABELS.dak }
];

const SALUTATIONS: { value: Salutation; label: string }[] = [
  { value: "dhr.", label: "Dhr." },
  { value: "mevr.", label: "Mevr." },
  { value: "dhr. en mevr.", label: "Dhr. en mevr." },
  { value: "familie", label: "Familie" }
];

function subsidyPositive(measure: Measure, id: string) {
  const line = measure.subsidies.find((s) => s.id === id);
  return line ? Math.abs(line.amount) : 0;
}

function rebuildMeasure(measure: Measure, parts: { modules: BuilderModules; nip: number }): Measure {
  const extraWork = buildModuleExtraWork(measure.type, parts.modules, measure.id);
  const isde = calculateIsdeSubsidy(measure);
  const subsidies = configuratorSubsidies(isde.amount, parts.nip, `ISDE subsidie (${isde.eligibleSquareMeters} m² × ${money(isde.rate)})`);
  const next: Measure = { ...measure, extraWork, subsidies };
  return { ...next, netInvestment: calculateNetInvestment(next) };
}

export function ProposalBuilder({ initialProposal }: { initialProposal: Proposal }) {
  const router = useRouter();
  const [proposal, setProposal] = useState(initialProposal);
  const [step, setStepState] = useState(1);
  const skipAutosaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proposalRef = useRef(proposal);
  proposalRef.current = proposal;
  const m0 = initialProposal.measures[0];
  const [modules, setModules] = useState<BuilderModules>(() => defaultModules(m0?.type ?? "vloer"));
  const [productKey, setProductKey] = useState(() => (m0 ? getProductKeyForMeasure(m0) : "pif35"));

  const measure = proposal.measures[0];
  const total = useMemo(() => proposal.measures.reduce((sum, m) => sum + m.netInvestment, 0), [proposal.measures]);
  const extraTotal = measure ? measureExtraWorkTotal(measure) : 0;
  const brutoTotal = measure ? measureBrutoTotal(measure) : 0;

  const nip = measure ? subsidyPositive(measure, "cfg-nip") : 0;
  const isdeCalculation = measure ? calculateIsdeSubsidy(measure) : null;

  useEffect(() => {
    if (!measure) return;
    setProductKey(getProductKeyForMeasure(measure));
  }, [measure?.id, measure?.type, measure?.productName]);

  const syncFinancials = useCallback((m: Measure, mod: BuilderModules, nipE: number) => {
    return rebuildMeasure(m, { modules: mod, nip: nipE });
  }, []);

  const applyModules = (nextMods: BuilderModules, measurePatch?: Partial<Measure>) => {
    if (!measure) return;
    setModules(nextMods);
    setProposal((p) => {
      const cur = p.measures[0];
      if (!cur) return p;
      const base = measurePatch ? { ...cur, ...measurePatch } : cur;
      return { ...p, measures: [syncFinancials(base, nextMods, nip)] };
    });
  };

  const pickMeasureType = (type: MeasureType) => {
    const blank = createBlankMeasure(type);
    const squareMeters = measure?.squareMeters ?? blank.squareMeters;
    const firstKey = MAIN_PRODUCTS[type][0]?.key ?? "pif35";
    const withProduct = applyProductToMeasure({ ...blank, squareMeters }, firstKey);
    const nextMods = defaultModules(type);
    setProductKey(firstKey);
    setModules(nextMods);
    setProposal((p) => ({
      ...p,
      measures: [rebuildMeasure({ ...withProduct, subsidyStatus: "single" }, { modules: nextMods, nip: 0 })],
      situation: {
        ...p.situation,
        isolationTargets: isolationLabelForType(type)
      }
    }));
    setStep(4);
  };

  const pickProduct = (key: string) => {
    if (!measure) return;
    const withProduct = applyProductToMeasure(measure, key);
    setProductKey(key);
    applyModules(modules, withProduct);
  };

  const setNip = (nextNip: number) => {
    if (!measure) return;
    setProposal((p) => {
      const cur = p.measures[0];
      if (!cur) return p;
      return { ...p, measures: [syncFinancials(cur, modules, nextNip)] };
    });
  };

  async function saveConcept(source: "advisor" | "pdf" | "upload" = "advisor") {
    const response = await fetch("/api/proposals/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...proposalRef.current, source })
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Concept opslaan mislukt.");
    }
  }

  function setStep(nextStep: number) {
    setStepState(nextStep);
    void saveConcept("advisor");
  }

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveConcept("advisor").catch((error) => console.error("[builder] autosave mislukt", error));
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [proposal]);

  async function downloadPdf() {
    await saveConcept("pdf");
    const response = await fetch(`/api/proposals/${proposal.id}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "PDF export mislukt.");
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("PDF export mislukt: het bestand is leeg.");
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = formatProposalPdfFilename(proposal);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function uploadToPipedrive() {
    await saveConcept("upload");
    await fetch(`/api/proposals/${proposal.id}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal)
    });
  }

  async function backToDashboard() {
    await saveConcept("advisor");
    router.push("/dashboard");
  }

  if (!measure) {
    return <p className="p-6 text-sm text-red-700">Geen maatregel geladen.</p>;
  }

  const products = MAIN_PRODUCTS[measure.type];

  return (
    <div className="grid min-h-screen grid-cols-[minmax(320px,520px)_1fr] bg-[#eef2ed]">
      <button
        className="fixed right-6 top-4 z-50 flex items-center gap-2 rounded-full border border-fihuma-line bg-white/95 px-4 py-2 text-xs font-black text-[#4a5751] shadow-[0_10px_30px_rgba(23,34,29,0.10)] backdrop-blur transition hover:border-fihuma-green hover:text-fihuma-green"
        onClick={() => {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          router.replace("/login");
        }}
        type="button"
      >
        <LogOut size={14} /> Uitloggen
      </button>
      <aside className="flex h-screen flex-col border-r border-fihuma-line bg-white">
        <div className="shrink-0 border-b border-fihuma-line px-5 py-4">
          <button
            className="mb-3 flex items-center gap-2 text-xs font-black text-[#64736b] transition hover:text-fihuma-green"
            onClick={backToDashboard}
            type="button"
          >
            <ArrowLeft size={15} /> Terug naar dashboard
          </button>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-fihuma-green">Configurator</p>
              <h1 className="text-lg font-black leading-tight">Offerte in 1 minuut</h1>
            </div>
            <div className="rounded-lg bg-fihuma-mint px-2.5 py-1.5 text-right">
              <span className="block text-[10px] text-[#64736b]">Netto</span>
              <strong className="text-sm">{money(total)}</strong>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  step === s.id ? "bg-fihuma-green text-white" : "bg-[#eef2ed] text-[#64736b]"
                }`}
                onClick={() => setStep(s.id)}
              >
                {s.id}. {s.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-fihuma-green px-3 py-2.5 text-xs font-bold text-white"
              onClick={downloadPdf}
              type="button"
            >
              <FileDown size={16} /> PDF
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line px-3 py-2.5 text-xs font-bold"
              onClick={uploadToPipedrive}
              type="button"
            >
              <UploadCloud size={16} /> Pipedrive
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <div className="grid gap-4">
              <p className="text-sm leading-relaxed text-[#4a5751]">
                Klant, maatregel, product & meerwerk, investering. Minimaal typen — de preview werkt live mee.
              </p>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#64736b]">Adviseur</span>
                <select
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={proposal.advisor.id}
                  onChange={(e) => {
                    const advisor = advisors.find((a) => a.id === e.target.value) ?? advisors[0];
                    setProposal({ ...proposal, advisor });
                  }}
                >
                  {advisors
                    .filter((a) => a.active)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-fihuma-green bg-fihuma-mint py-4 text-sm font-black text-fihuma-green"
                onClick={() => setStep(2)}
              >
                Start <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#64736b]">Klant</p>
              <p className="text-xs font-bold text-[#64736b]">Aanhef</p>
              <div className="grid grid-cols-2 gap-2">
                {SALUTATIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setProposal({ ...proposal, customer: { ...proposal.customer, salutation: s.value } })}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${
                      proposal.customer.salutation === s.value ? "border-fihuma-green bg-fihuma-mint" : "border-fihuma-line bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                placeholder="Naam"
                value={proposal.customer.name}
                onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, name: e.target.value } })}
              />
              <input
                className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                placeholder="Adres"
                value={proposal.customer.address}
                onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, address: e.target.value } })}
              />
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  placeholder="Postcode"
                  value={proposal.customer.postalCode}
                  onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, postalCode: e.target.value } })}
                />
                <input
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  placeholder="Plaats"
                  value={proposal.customer.city}
                  onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, city: e.target.value } })}
                />
              </div>
              <input
                className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                placeholder="Telefoon"
                value={proposal.customer.phone}
                onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, phone: e.target.value } })}
              />
              <input
                className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                placeholder="E-mail"
                value={proposal.customer.email}
                onChange={(e) => setProposal({ ...proposal, customer: { ...proposal.customer, email: e.target.value } })}
              />
              <button type="button" className="mt-2 rounded-lg bg-fihuma-green py-2.5 text-sm font-bold text-white" onClick={() => setStep(3)}>
                Verder naar maatregel
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#64736b]">Maatregel</p>
              <label className="grid gap-1 rounded-xl border border-fihuma-line bg-[#fbfcfa] p-3">
                <span className="text-xs font-bold text-[#64736b]">Oppervlakte (m²)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={measure.squareMeters}
                  onChange={(e) =>
                    setProposal((p) => {
                      const cur = p.measures[0];
                      if (!cur) return p;
                      return { ...p, measures: [syncFinancials({ ...cur, squareMeters: Number(e.target.value) || 0 }, modules, nip)] };
                    })
                  }
                />
                <span className="text-[11px] leading-relaxed text-[#64736b]">Vul eerst het aantal m² in en kies daarna de maatregel, bijvoorbeeld bodemisolatie.</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_CARDS.map((card) => (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => pickMeasureType(card.type)}
                    className={`rounded-xl border-2 px-3 py-3 text-left transition ${
                      measure.type === card.type ? "border-fihuma-green bg-fihuma-mint" : "border-fihuma-line bg-white hover:border-fihuma-green"
                    }`}
                  >
                    <span className="block text-sm font-black leading-tight">{card.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#64736b]">Product & meerwerk</p>
              <div className="grid gap-2">
                {products.map((p) => {
                  const isSel = p.key === productKey;
                  return (
                    <div key={p.key} className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => pickProduct(p.key)}
                        className={`flex items-center justify-between rounded-xl border-2 px-3 py-3 text-left ${
                          isSel ? "border-fihuma-green bg-fihuma-mint" : "border-fihuma-line bg-white"
                        }`}
                      >
                        <span className="text-sm font-black">{p.label}</span>
                        {isSel ? <Check className="text-fihuma-green" size={18} /> : null}
                      </button>
                      {isSel ? <MeerwerkPanel measureType={measure.type} modules={modules} onChange={(next) => applyModules(next)} /> : null}
                    </div>
                  );
                })}
              </div>
              {extraTotal > 0 ? (
                <p className="text-xs text-[#64736b]">
                  Meerwerk: <strong className="text-fihuma-green">{money(extraTotal)}</strong> · Bruto totaal:{" "}
                  <strong>{money(brutoTotal)}</strong>
                </p>
              ) : null}
              <button type="button" className="text-xs font-bold text-[#64736b] underline" onClick={() => setStep(3)}>
                Ander maatregeltype
              </button>
              <button type="button" className="rounded-lg bg-fihuma-green py-2.5 text-sm font-bold text-white" onClick={() => setStep(5)}>
                Naar investering
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#64736b]">Investering</p>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#64736b]">Basis isolatie (€)</span>
                <input
                  type="number"
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={measure.grossInvestment}
                  onChange={(e) =>
                    setProposal((p) => {
                      const cur = p.measures[0];
                      if (!cur) return p;
                      return { ...p, measures: [syncFinancials({ ...cur, grossInvestment: Number(e.target.value) || 0 }, modules, nip)] };
                    })
                  }
                />
              </label>
              {measure.extraWork.length > 0 ? (
                <div className="rounded-lg border border-fihuma-line bg-[#fbfcfa] px-3 py-2 text-xs">
                  <p className="mb-1 font-bold text-[#64736b]">Meerwerk</p>
                  <ul className="space-y-0.5">
                    {measure.extraWork.map((line) => (
                      <li className="flex justify-between gap-2" key={line.id}>
                        <span>{line.description}</span>
                        <span className="font-bold">{money(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="rounded-lg border border-fihuma-line bg-fihuma-mint px-3 py-2 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Bruto investering (incl. meerwerk)</span>
                  <span className="text-fihuma-green">{money(brutoTotal)}</span>
                </div>
              </div>
              <div className="grid gap-2 rounded-xl border border-fihuma-line bg-[#fbfcfa] p-3">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-[#64736b]">ISDE subsidie-situatie</span>
                  <select
                    className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                    value={measure.subsidyStatus ?? "single"}
                    onChange={(e) =>
                      setProposal((p) => {
                        const cur = p.measures[0];
                        if (!cur) return p;
                        return { ...p, measures: [syncFinancials({ ...cur, subsidyStatus: e.target.value as Measure["subsidyStatus"] }, modules, nip)] };
                      })
                    }
                  >
                    {ISDE_SUBSIDY_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {isdeCalculation ? (
                  <div className="grid gap-1 text-xs text-[#4a5751]">
                    <div className="flex justify-between gap-3">
                      <span>Automatische ISDE</span>
                      <strong className="text-fihuma-green">{money(isdeCalculation.amount)}</strong>
                    </div>
                    <p>
                      {isdeCalculation.eligibleSquareMeters} m² subsidiabel × {money(isdeCalculation.rate)} per m².
                    </p>
                    {isdeCalculation.isTooSmall ? (
                      <p className="rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-800">
                        Voor {MEASURE_TYPE_LABELS[measure.type].toLowerCase()} geldt een minimale oppervlakte van {isdeCalculation.min} m² voor subsidie.
                      </p>
                    ) : null}
                    {isdeCalculation.isCapped ? (
                      <p className="rounded-lg bg-fihuma-mint px-2 py-1 font-bold text-fihuma-green">
                        Voor {MEASURE_TYPE_LABELS[measure.type].toLowerCase()} wordt subsidie berekend over maximaal {isdeCalculation.max} m².
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#64736b]">NIP / gemeente subsidie (€)</span>
                <input
                  type="number"
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={nip || ""}
                  placeholder="0"
                  onChange={(e) => setNip(Number(e.target.value) || 0)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#64736b]">Betalingscondities</span>
                <select
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={PAYMENT_TERM_OPTIONS.find((option) => option.text === proposal.agreement.paymentTerms)?.id ?? PAYMENT_TERM_OPTIONS[1].id}
                  onChange={(e) => {
                    const option = PAYMENT_TERM_OPTIONS.find((item) => item.id === e.target.value) ?? PAYMENT_TERM_OPTIONS[1];
                    setProposal({ ...proposal, agreement: { ...proposal.agreement, paymentTerms: option.text } });
                  }}
                >
                  {PAYMENT_TERM_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#64736b]">Subsidievoorwaarden</span>
                <select
                  className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
                  value={SUBSIDY_CLAUSE_OPTIONS.find((option) => option.text === proposal.agreement.subsidyClause)?.id ?? SUBSIDY_CLAUSE_OPTIONS[0].id}
                  onChange={(e) => {
                    const option = SUBSIDY_CLAUSE_OPTIONS.find((item) => item.id === e.target.value) ?? SUBSIDY_CLAUSE_OPTIONS[0];
                    setProposal({ ...proposal, agreement: { ...proposal.agreement, subsidyClause: option.text } });
                  }}
                >
                  {SUBSIDY_CLAUSE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border-2 border-fihuma-green bg-fihuma-mint px-3 py-3">
                <p className="text-xs font-bold uppercase text-fihuma-green">Netto (automatisch)</p>
                <p className="text-xl font-black text-fihuma-green">{money(measure.netInvestment)}</p>
              </div>
              <button type="button" className="rounded-lg bg-fihuma-green py-2.5 text-sm font-bold text-white" onClick={() => setStep(6)}>
                Afronden
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-3">
              <p className="text-sm font-bold text-fihuma-green">Samenvatting offerte</p>
              <ConfiguratorSummary proposal={proposal} />
            </div>
          )}
        </div>
      </aside>

      <section className="builder-preview h-screen overflow-auto px-6 py-6">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-fihuma-green">Live preview</p>
        <ProposalDocument proposal={proposal} />
      </section>
    </div>
  );
}
