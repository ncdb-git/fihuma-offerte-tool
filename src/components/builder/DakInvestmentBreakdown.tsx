"use client";

import { NumberInput } from "@/components/ui/NumberInput";
import { getDakInvestmentLines, isIsofastProductKey } from "@/lib/dak-combination";
import { money } from "@/lib/proposal-engine";
import type { DakCombination, Measure } from "@/lib/types";

type Props = {
  measure: Measure;
  productKey: string;
  combination: DakCombination;
  onRatesChange: (rates: DakCombination["ratesPerM2"]) => void;
};

export function DakInvestmentBreakdown({ measure, productKey, combination, onRatesChange }: Props) {
  if (!isIsofastProductKey(productKey)) return null;

  const previewMeasure = { ...measure, dakCombination: combination };
  const lines = getDakInvestmentLines(previewMeasure, productKey) ?? [];

  return (
    <div className="rounded-xl border border-fihuma-line bg-[#fbfcfa] p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-fihuma-green">Prijsopbouw dak (per deel)</p>
      <ul className="space-y-2 text-sm">
        {lines.map((line) => (
          <li className="flex justify-between gap-3 border-b border-fihuma-line/60 pb-2 last:border-0" key={line.id}>
            <span className="text-[#4a5751]">
              {line.label}
              <span className="block text-xs text-[#64736b]">
                {line.squareMeters} m² {line.productName}
              </span>
            </span>
            <strong>{money(line.amount)}</strong>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <span className="font-bold text-[#64736b]">Tarief Isofast (€/m²)</span>
          <NumberInput
            className="rounded-lg border border-fihuma-line px-2 py-1.5 text-sm"
            min={0}
            step={0.5}
            value={combination.ratesPerM2.isofast}
            onChange={(e) =>
              onRatesChange({
                ...combination.ratesPerM2,
                isofast: Math.max(0, Number(e.target.value) || 0)
              })
            }
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-bold text-[#64736b]">Tarief ROOF35 (€/m²)</span>
          <NumberInput
            className="rounded-lg border border-fihuma-line px-2 py-1.5 text-sm"
            min={0}
            step={0.5}
            value={combination.ratesPerM2.roof35}
            onChange={(e) =>
              onRatesChange({
                ...combination.ratesPerM2,
                roof35: Math.max(0, Number(e.target.value) || 0)
              })
            }
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-bold text-[#64736b]">Tarief ROOF40 (€/m²)</span>
          <NumberInput
            className="rounded-lg border border-fihuma-line px-2 py-1.5 text-sm"
            min={0}
            step={0.5}
            value={combination.ratesPerM2.roof40}
            onChange={(e) =>
              onRatesChange({
                ...combination.ratesPerM2,
                roof40: Math.max(0, Number(e.target.value) || 0)
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
