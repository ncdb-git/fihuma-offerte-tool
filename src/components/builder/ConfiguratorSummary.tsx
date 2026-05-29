"use client";

import {
  calculateIsdeSubsidy,
  formatCustomerSalutation,
  measureAdjustmentsTotal,
  measureBrutoTotal,
  measureExtraWorkTotal,
  MEASURE_TYPE_LABELS,
  money
} from "@/lib/proposal-engine";
import { Measure, Proposal } from "@/lib/types";

const SALUTATION_LABELS: Record<Proposal["customer"]["salutation"], string> = {
  "dhr.": "Dhr.",
  "mevr.": "Mevr.",
  "dhr. en mevr.": "Dhr. en mevr.",
  familie: "Familie"
};

function subsidyAmount(measure: Measure, id: string) {
  const line = measure.subsidies.find((s) => s.id === id);
  return line ? Math.abs(line.amount) : 0;
}

export function ConfiguratorSummary({ proposal }: { proposal: Proposal }) {
  const { customer } = proposal;

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-fihuma-line bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-fihuma-green">Klantgegevens</h3>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#64736b]">Aanhef</dt>
            <dd className="font-bold">{SALUTATION_LABELS[customer.salutation]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64736b]">Naam</dt>
            <dd className="text-right font-bold">{formatCustomerSalutation(customer)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64736b]">Adres</dt>
            <dd className="text-right">{customer.address}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64736b]">Postcode & plaats</dt>
            <dd className="text-right">
              {customer.postalCode} {customer.city}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64736b]">Contact</dt>
            <dd className="text-right">
              {customer.phone}
              <br />
              {customer.email}
            </dd>
          </div>
        </dl>
      </section>

      {proposal.measures.map((measure) => {
        const isde = subsidyAmount(measure, "cfg-isde");
        const nip = subsidyAmount(measure, "cfg-nip");
        const isdeCalculation = calculateIsdeSubsidy(measure);
        const extraTotal = measureExtraWorkTotal(measure);
        const adjustmentsTotal = measureAdjustmentsTotal(measure);
        const brutoTotal = measureBrutoTotal(measure);
        return (
          <section className="rounded-xl border border-fihuma-line border-l-4 border-l-fihuma-green bg-[#fbfcfa] p-4" key={measure.id}>
            <h3 className="text-base font-black text-fihuma-green">{MEASURE_TYPE_LABELS[measure.type]}</h3>
            <p className="mt-1 text-sm font-bold text-[#17221d]">{measure.productName}</p>
            <ul className="mt-3 space-y-1 text-sm text-[#4a5751]">
              <li>• {measure.squareMeters} m²</li>
            </ul>
            {measure.extraWork.length > 0 ? (
              <div className="mt-3 rounded-lg border border-fihuma-line bg-white p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-fihuma-green">Meerwerk</p>
                <ul className="space-y-1.5 text-sm">
                  {measure.extraWork.map((line) => (
                    <li className="flex justify-between gap-3" key={line.id}>
                      <span className="text-[#4a5751]">{line.description}</span>
                      <span className="shrink-0 font-bold">{money(line.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <dl className="mt-4 space-y-1.5 border-t border-fihuma-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Basis isolatie</dt>
                <dd className="font-bold">{money(measure.grossInvestment)}</dd>
              </div>
              {extraTotal > 0 ? (
                <div className="flex justify-between text-[#4a5751]">
                  <dt>Meerwerk</dt>
                  <dd className="font-bold">{money(extraTotal)}</dd>
                </div>
              ) : null}
              {adjustmentsTotal !== 0 ? (
                <div className="flex justify-between text-[#4a5751]">
                  <dt>Korting / toeslag</dt>
                  <dd className="font-bold">{money(adjustmentsTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-dashed border-fihuma-line pt-1.5">
                <dt className="font-bold">Bruto investering</dt>
                <dd className="font-bold">{money(brutoTotal)}</dd>
              </div>
              {isde > 0 ? (
                <div className="flex justify-between text-fihuma-green">
                  <dt>ISDE subsidie ({isdeCalculation.eligibleSquareMeters} m²)</dt>
                  <dd className="font-bold">− {money(isde)}</dd>
                </div>
              ) : null}
              {nip > 0 ? (
                <div className="flex justify-between text-fihuma-green">
                  <dt>NIP / gemeente subsidie</dt>
                  <dd className="font-bold">− {money(nip)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-fihuma-line pt-2 text-base">
                <dt className="font-black">Netto investering</dt>
                <dd className="font-black text-fihuma-green">{money(measure.netInvestment)}</dd>
              </div>
            </dl>
          </section>
        );
      })}
    </div>
  );
}
