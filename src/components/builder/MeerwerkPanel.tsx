"use client";

import { MODULE_DEFAULT_PRICES, type BuilderModules } from "@/lib/proposal-engine";
import { MeasureType } from "@/lib/types";

type Props = {
  measureType: MeasureType;
  modules: BuilderModules;
  onChange: (modules: BuilderModules) => void;
};

export function MeerwerkPanel({ measureType, modules, onChange }: Props) {
  const patch = (p: Partial<BuilderModules>) => onChange({ ...modules, ...p });

  return (
    <div className="grid gap-3 rounded-xl border border-fihuma-line bg-[#fbfcfa] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-fihuma-green">Meerwerk</p>
      {measureType === "spouwmuur" && (
        <>
          <TogglePriceRow
            label="Natuurvriendelijk isoleren"
            enabled={modules.natuur}
            price={modules.natuurPrijs}
            defaultPrice={MODULE_DEFAULT_PRICES.spouw_natuur}
            onToggle={(v) => patch({ natuur: v, natuurPrijs: v ? modules.natuurPrijs || MODULE_DEFAULT_PRICES.spouw_natuur : 0 })}
            onPrice={(v) => patch({ natuurPrijs: v })}
          />
          <TogglePriceRow
            label="Hoogwerker"
            enabled={modules.hoogwerker}
            price={modules.hoogwerkerPrijs}
            defaultPrice={MODULE_DEFAULT_PRICES.spouw_hoog}
            onToggle={(v) => patch({ hoogwerker: v, hoogwerkerPrijs: v ? modules.hoogwerkerPrijs || MODULE_DEFAULT_PRICES.spouw_hoog : 0 })}
            onPrice={(v) => patch({ hoogwerkerPrijs: v })}
          />
          <CountPriceRow
            label="Ventilatiekokers"
            count={modules.ventKokers}
            max={4}
            unitPrice={modules.ventKokerPrijs}
            unitDefault={MODULE_DEFAULT_PRICES.spouw_koker}
            onCount={(n) => patch({ ventKokers: n })}
            onUnitPrice={(v) => patch({ ventKokerPrijs: v })}
          />
        </>
      )}
      {measureType === "vloer" && (
        <>
          <TogglePriceRow
            label="Bodemfolie"
            enabled={modules.bodemfolie}
            price={modules.bodemfoliePrijs}
            defaultPrice={MODULE_DEFAULT_PRICES.vloer_folie}
            onToggle={(v) => patch({ bodemfolie: v, bodemfoliePrijs: v ? modules.bodemfoliePrijs || MODULE_DEFAULT_PRICES.vloer_folie : 0 })}
            onPrice={(v) => patch({ bodemfoliePrijs: v })}
          />
          <TogglePriceRow
            label="Stofvlies"
            enabled={modules.stofvlies}
            price={modules.stofvliesPrijs}
            defaultPrice={MODULE_DEFAULT_PRICES.vloer_stof}
            onToggle={(v) => patch({ stofvlies: v, stofvliesPrijs: v ? modules.stofvliesPrijs || MODULE_DEFAULT_PRICES.vloer_stof : 0 })}
            onPrice={(v) => patch({ stofvliesPrijs: v })}
          />
          <CountPriceRow
            label="Ventilatiekokers"
            count={modules.ventKokers}
            max={4}
            unitPrice={modules.ventKokerPrijs}
            unitDefault={MODULE_DEFAULT_PRICES.spouw_koker}
            onCount={(n) => patch({ ventKokers: n })}
            onUnitPrice={(v) => patch({ ventKokerPrijs: v })}
          />
          <CountPriceRow
            label="Mangat"
            count={modules.mangat}
            max={2}
            unitPrice={modules.mangatPrijs}
            unitDefault={MODULE_DEFAULT_PRICES.vloer_mangat}
            onCount={(n) => patch({ mangat: n })}
            onUnitPrice={(v) => patch({ mangatPrijs: v })}
          />
          <TogglePriceRow
            label="Puin ruimen"
            enabled={modules.puinRuimen}
            price={modules.puinPrijs}
            defaultPrice={175}
            onToggle={(v) => patch({ puinRuimen: v, puinPrijs: v ? modules.puinPrijs || 175 : 0 })}
            onPrice={(v) => patch({ puinPrijs: v })}
          />
        </>
      )}
      {measureType === "bodem" && (
        <>
          <CountPriceRow
            label="Ventilatiekokers"
            count={modules.ventKokers}
            max={4}
            unitPrice={modules.ventKokerPrijs}
            unitDefault={MODULE_DEFAULT_PRICES.spouw_koker}
            onCount={(n) => patch({ ventKokers: n })}
            onUnitPrice={(v) => patch({ ventKokerPrijs: v })}
          />
          <CountPriceRow
            label="Mangat"
            count={modules.mangat}
            max={2}
            unitPrice={modules.mangatPrijs}
            unitDefault={MODULE_DEFAULT_PRICES.vloer_mangat}
            onCount={(n) => patch({ mangat: n })}
            onUnitPrice={(v) => patch({ mangatPrijs: v })}
          />
          <TogglePriceRow
            label="Hakken / opmetseling"
            enabled={modules.hakken}
            price={modules.hakkenPrijs}
            defaultPrice={MODULE_DEFAULT_PRICES.bodem_hak}
            onToggle={(v) => patch({ hakken: v, hakkenPrijs: v ? modules.hakkenPrijs || MODULE_DEFAULT_PRICES.bodem_hak : 0 })}
            onPrice={(v) => patch({ hakkenPrijs: v })}
          />
        </>
      )}
      {measureType === "dak" && (
        <TogglePriceRow
          label="Gipsafwerking"
          enabled={modules.gips}
          price={modules.gipsPrijs}
          defaultPrice={MODULE_DEFAULT_PRICES.dak_gips}
          onToggle={(v) => patch({ gips: v, gipsPrijs: v ? modules.gipsPrijs || MODULE_DEFAULT_PRICES.dak_gips : 0 })}
          onPrice={(v) => patch({ gipsPrijs: v })}
        />
      )}
    </div>
  );
}

function CountPicker({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-black ${
            value === i ? "border-fihuma-green bg-fihuma-mint text-fihuma-green" : "border-fihuma-line bg-white"
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

function CountPriceRow({
  label,
  count,
  max,
  unitPrice,
  unitDefault,
  onCount,
  onUnitPrice
}: {
  label: string;
  count: number;
  max: number;
  unitPrice: number;
  unitDefault: number;
  onCount: (n: number) => void;
  onUnitPrice: (n: number) => void;
}) {
  const effectiveUnit = unitPrice || unitDefault;
  const total = count * effectiveUnit;

  return (
    <div className="rounded-xl border border-fihuma-line bg-white p-3">
      <p className="mb-2 text-sm font-bold">{label}</p>
      <CountPicker value={count} max={max} onChange={onCount} />
      {count > 0 ? (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#64736b]">Prijs per stuk (€)</span>
            <input
              type="number"
              className="rounded-lg border border-fihuma-line px-3 py-2 text-sm font-bold"
              value={unitPrice || ""}
              placeholder={String(unitDefault)}
              onChange={(e) => onUnitPrice(Number(e.target.value) || 0)}
            />
          </label>
          <div className="flex justify-between rounded-lg bg-fihuma-mint px-3 py-2 text-sm">
            <span className="font-bold text-[#64736b]">
              Totaal ({count}× {moneyShort(effectiveUnit)})
            </span>
            <span className="font-black text-fihuma-green">{moneyShort(total)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TogglePriceRow({
  label,
  enabled,
  price,
  defaultPrice,
  onToggle,
  onPrice
}: {
  label: string;
  enabled: boolean;
  price: number;
  defaultPrice: number;
  onToggle: (v: boolean) => void;
  onPrice: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-fihuma-line bg-white p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <input type="checkbox" className="h-5 w-5 accent-fihuma-green" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
      </label>
      {enabled ? (
        <label className="mt-3 grid gap-1">
          <span className="text-xs font-bold text-[#64736b]">Prijs (€)</span>
          <input
            type="number"
            className="rounded-lg border border-fihuma-line px-3 py-2 text-sm font-bold"
            value={price || ""}
            placeholder={String(defaultPrice)}
            onChange={(e) => onPrice(Number(e.target.value) || 0)}
          />
        </label>
      ) : null}
    </div>
  );
}

function moneyShort(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
