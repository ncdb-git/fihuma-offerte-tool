"use client";

import type { CreateLoadSpanView } from "@/lib/create-load-timing";

export type CreateLoadTimingView = {
  totalMs: number;
  frontendMs: number;
  supabaseMs: number;
  pipedriveMs: number;
  serverMs: number;
  spans: CreateLoadSpanView[];
};

function ms(value: number) {
  return `${value.toLocaleString("nl-NL")} ms`;
}

function pct(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function CreateLoadWaterfall({
  timing,
  loading,
  phase
}: {
  timing: CreateLoadTimingView | null;
  loading?: boolean;
  phase?: string;
}) {
  const rows = timing
    ? [
        { label: "Frontend", ms: timing.frontendMs, hint: "Render, hydrate, netwerk, server-mapping" },
        { label: "Supabase", ms: timing.supabaseMs, hint: "Database-queries" },
        { label: "Pipedrive", ms: timing.pipedriveMs, hint: "CRM API" }
      ]
    : [
        { label: "Frontend", ms: null, hint: "…" },
        { label: "Supabase", ms: null, hint: "…" },
        { label: "Pipedrive", ms: null, hint: "…" }
      ];

  const total = timing?.totalMs ?? null;

  return (
    <section className="border-b border-fihuma-line bg-[#0f1411] px-4 py-3 text-white">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Laadtijd /create</p>
        {loading ? (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">{phase ?? "Laden…"}</span>
        ) : (
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">Gereed</span>
        )}
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-white/50">
            <th className="pb-2 pr-4 font-bold">Fase</th>
            <th className="pb-2 pr-4 text-right font-bold">ms</th>
            <th className="pb-2 text-right font-bold">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-white/5" key={row.label}>
              <td className="py-2 pr-4">
                <span className="font-bold">{row.label}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-white/45">{row.hint}</span>
              </td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">{row.ms === null ? "…" : ms(row.ms)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-white/70">
                {row.ms === null || total === null ? "…" : pct(row.ms, total)}
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 font-black">Totaal (muurklok)</td>
            <td className="pt-2 text-right font-mono font-black tabular-nums">{total === null ? "…" : ms(total)}</td>
            <td className="pt-2 text-right font-mono tabular-nums">100%</td>
          </tr>
        </tbody>
      </table>

      {timing && timing.spans.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-bold text-white/60">Detail (alle stappen)</summary>
          <table className="mt-2 w-full border-collapse text-[11px]">
            <tbody>
              {timing.spans.map((span) => (
                <tr className="border-t border-white/5" key={`${span.category}-${span.label}`}>
                  <td className="py-1 pr-2 text-white/50">{span.category}</td>
                  <td className="py-1 pr-2">{span.label}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{ms(span.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </section>
  );
}
