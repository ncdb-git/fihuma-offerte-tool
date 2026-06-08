"use client";

import { NumberInput } from "@/components/ui/NumberInput";
import { defaultDakCombination, unfinishedProductLabel } from "@/lib/dak-combination";
import { money } from "@/lib/proposal-engine";
import type { DakCombination, DakUnfinishedProduct } from "@/lib/types";

const OPTIONS: { value: DakUnfinishedProduct; label: string }[] = [
  { value: "none", label: "Geen combinatie" },
  { value: "roof35", label: "PIF ROOF35 onafgewerkt" },
  { value: "roof40", label: "PIF ROOF40 onafgewerkt" }
];

type Props = {
  combination: DakCombination;
  isofastSquareMeters: number;
  onChange: (next: DakCombination) => void;
};

export function DakCombinationPanel({ combination, isofastSquareMeters, onChange }: Props) {
  const showUnfinished = combination.unfinishedProduct !== "none";

  return (
    <section className="rounded-xl border border-fihuma-line bg-[#fbfcfa] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-fihuma-green">Combinatie met onafgewerkt dakdeel</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#64736b]">
        Bijv. knieschotten of lage dakdelen. PIF Isofast: {isofastSquareMeters || 0} m². Vul m² én offertebedrag in voor het
        onafgewerkte deel — m² telt mee voor ISDE.
      </p>

      <div className="mt-3 grid gap-2">
        {OPTIONS.map((option) => (
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-bold ${
              combination.unfinishedProduct === option.value
                ? "border-fihuma-green bg-fihuma-mint text-fihuma-green"
                : "border-fihuma-line bg-white text-[#17221d]"
            }`}
            key={option.value}
          >
            <input
              checked={combination.unfinishedProduct === option.value}
              className="sr-only"
              name="dak-combination"
              onChange={() =>
                onChange({
                  ...combination,
                  unfinishedProduct: option.value,
                  unfinishedSquareMeters: option.value === "none" ? 0 : combination.unfinishedSquareMeters,
                  unfinishedQuoteAmount: option.value === "none" ? 0 : combination.unfinishedQuoteAmount
                })
              }
              type="radio"
            />
            {option.label}
          </label>
        ))}
      </div>

      {showUnfinished ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#64736b]">
              m² onafgewerkt deel ({unfinishedProductLabel(combination.unfinishedProduct)})
            </span>
            <NumberInput
              className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
              min={0}
              step={1}
              value={combination.unfinishedSquareMeters}
              onChange={(e) =>
                onChange({
                  ...combination,
                  unfinishedSquareMeters: Math.max(0, Number(e.target.value) || 0)
                })
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#64736b]">Offertebedrag onafgewerkt deel (€)</span>
            <NumberInput
              className="rounded-lg border border-fihuma-line px-3 py-2 text-sm"
              min={0}
              step={1}
              value={combination.unfinishedQuoteAmount}
              onChange={(e) =>
                onChange({
                  ...combination,
                  unfinishedQuoteAmount: Math.max(0, Number(e.target.value) || 0)
                })
              }
            />
          </label>
        </div>
      ) : null}

      {showUnfinished && combination.unfinishedQuoteAmount > 0 ? (
        <p className="mt-2 text-[11px] text-fihuma-green">
          Meerwerkregel: {money(combination.unfinishedQuoteAmount)}
          {combination.unfinishedSquareMeters > 0
            ? ` · ${combination.unfinishedSquareMeters} m² telt mee voor ISDE (${isofastSquareMeters + combination.unfinishedSquareMeters} m² totaal)`
            : null}
        </p>
      ) : null}
    </section>
  );
}

export function initialDakCombinationForIsofast(): DakCombination {
  return defaultDakCombination();
}
