import type { Measure } from "@/lib/types";

const NIP_SUBSIDY_ID = "cfg-nip";

export function extractNipEuro(measure: Measure): number {
  const line = measure.subsidies?.find((entry) => entry.id === NIP_SUBSIDY_ID);
  if (!line) return 0;
  return Math.abs(line.amount);
}

export function buildSubsidyLines(isdeEuro: number, nipEuro: number, isdeDescription: string) {
  const lines: { id: string; description: string; amount: number }[] = [];
  if (isdeEuro > 0) {
    lines.push({ id: "cfg-isde", description: isdeDescription, amount: -Math.abs(isdeEuro) });
  }
  if (nipEuro > 0) {
    lines.push({ id: NIP_SUBSIDY_ID, description: "NIP / gemeentelijke subsidie", amount: -Math.abs(nipEuro) });
  }
  return lines;
}
