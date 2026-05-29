"use client";

import { Plus, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/ui/NumberInput";
import { money } from "@/lib/proposal-engine";
import { Measure, MoneyLine } from "@/lib/types";

type Props = {
  measureId: string;
  adjustments: MoneyLine[];
  onChange: (next: MoneyLine[]) => void;
};

function newLine(measureId: string): MoneyLine {
  return {
    id: `${measureId}-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    amount: 0
  };
}

export function AdjustmentsPanel({ measureId, adjustments, onChange }: Props) {
  return (
    <div className="grid gap-2 rounded-xl border border-fihuma-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-fihuma-green">Korting / toeslag</p>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-fihuma-line px-2 py-1 text-[11px] font-bold text-fihuma-green"
          onClick={() => onChange([...adjustments, newLine(measureId)])}
        >
          <Plus size={14} /> Regel
        </button>
      </div>
      {adjustments.length === 0 ? (
        <p className="text-[11px] text-[#64736b]">Voeg korting (negatief) of toeslag (positief) toe, bijv. zomeractie −€200.</p>
      ) : null}
      {adjustments.map((line, index) => (
        <div className="grid gap-2 rounded-lg border border-fihuma-line bg-[#fbfcfa] p-2" key={line.id}>
          <input
            className="rounded-lg border border-fihuma-line px-2 py-1.5 text-sm"
            placeholder="Omschrijving"
            value={line.description}
            onChange={(e) => {
              const next = [...adjustments];
              next[index] = { ...line, description: e.target.value };
              onChange(next);
            }}
          />
          <div className="flex items-center gap-2">
            <NumberInput
              className="flex-1 rounded-lg border border-fihuma-line px-2 py-1.5 text-sm"
              step={1}
              value={line.amount === 0 ? "" : line.amount}
              placeholder="Bedrag (±)"
              onChange={(e) => {
                const next = [...adjustments];
                next[index] = { ...line, amount: Number(e.target.value) || 0 };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-fihuma-line p-2 text-[#64736b]"
              title="Verwijderen"
              onClick={() => onChange(adjustments.filter((row) => row.id !== line.id))}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {line.amount !== 0 ? <p className="text-[11px] font-bold text-fihuma-green">{money(line.amount)}</p> : null}
        </div>
      ))}
    </div>
  );
}
