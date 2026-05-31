import type { DakCombination, DakInvestmentLine, DakUnfinishedProduct, Measure } from "@/lib/types";

export const ISOFAST_PRODUCT_KEY = "isofast35";

export const DAK_COMBINATION_DEFAULT_RATES = {
  isofast: 52,
  roof35: 38,
  roof40: 40
} as const;

export function isIsofastProductKey(productKey: string) {
  return productKey === ISOFAST_PRODUCT_KEY;
}

export function defaultDakCombination(): DakCombination {
  return {
    unfinishedProduct: "none",
    unfinishedSquareMeters: 0,
    ratesPerM2: { ...DAK_COMBINATION_DEFAULT_RATES }
  };
}

export function normalizeDakCombination(measure: Measure): DakCombination {
  const raw = measure.dakCombination;
  const rates = raw?.ratesPerM2 ?? DAK_COMBINATION_DEFAULT_RATES;
  return {
    unfinishedProduct: raw?.unfinishedProduct ?? "none",
    unfinishedSquareMeters: Math.max(0, Number(raw?.unfinishedSquareMeters) || 0),
    ratesPerM2: {
      isofast: Number(rates.isofast) || DAK_COMBINATION_DEFAULT_RATES.isofast,
      roof35: Number(rates.roof35) || DAK_COMBINATION_DEFAULT_RATES.roof35,
      roof40: Number(rates.roof40) || DAK_COMBINATION_DEFAULT_RATES.roof40
    }
  };
}

export function dakSquareMetersForSubsidy(measure: Measure) {
  const combo = normalizeDakCombination(measure);
  const unfinished =
    combo.unfinishedProduct === "none" ? 0 : combo.unfinishedSquareMeters;
  return Math.max(0, measure.squareMeters) + unfinished;
}

export function dakTotalSquareMeters(measure: Measure) {
  return dakSquareMetersForSubsidy(measure);
}

export function unfinishedProductLabel(product: DakUnfinishedProduct) {
  if (product === "roof35") return "PIF ROOF35 onafgewerkt";
  if (product === "roof40") return "PIF ROOF40 onafgewerkt";
  return "";
}

export function formatDakProductSummary(measure: Measure, productKey: string) {
  if (!isIsofastProductKey(productKey)) {
    return measure.productName.trim() || "Nog te kiezen";
  }
  const combo = normalizeDakCombination(measure);
  if (combo.unfinishedProduct === "none") {
    return "PIF Isofast";
  }
  const suffix =
    combo.unfinishedProduct === "roof35" ? "PIF ROOF35" : "PIF ROOF40";
  return `PIF Isofast + ${suffix}`;
}

export function calculateDakCombinedGross(measure: Measure, productKey: string) {
  if (measure.type !== "dak" || !isIsofastProductKey(productKey)) {
    return Math.max(0, measure.grossInvestment);
  }
  const combo = normalizeDakCombination(measure);
  const isofastPart = Math.max(0, measure.squareMeters) * combo.ratesPerM2.isofast;
  const unfinishedPart =
    combo.unfinishedProduct === "roof35"
      ? combo.unfinishedSquareMeters * combo.ratesPerM2.roof35
      : combo.unfinishedProduct === "roof40"
        ? combo.unfinishedSquareMeters * combo.ratesPerM2.roof40
        : 0;
  return Math.round((isofastPart + unfinishedPart) * 100) / 100;
}

export function getDakInvestmentLines(measure: Measure, productKey: string): DakInvestmentLine[] | null {
  if (measure.type !== "dak" || !isIsofastProductKey(productKey)) {
    return null;
  }
  const combo = normalizeDakCombination(measure);
  const lines: DakInvestmentLine[] = [
    {
      id: "dak-isofast",
      label: "Dakisolatie PIF Isofast",
      productName: "PIF Isofast",
      squareMeters: measure.squareMeters,
      amount: Math.round(measure.squareMeters * combo.ratesPerM2.isofast * 100) / 100
    }
  ];
  if (combo.unfinishedProduct === "roof35" && combo.unfinishedSquareMeters > 0) {
    lines.push({
      id: "dak-roof35-unfinished",
      label: "Aanvullend dakdeel PIF ROOF35 onafgewerkt",
      productName: "PIF ROOF35 onafgewerkt",
      squareMeters: combo.unfinishedSquareMeters,
      amount: Math.round(combo.unfinishedSquareMeters * combo.ratesPerM2.roof35 * 100) / 100
    });
  }
  if (combo.unfinishedProduct === "roof40" && combo.unfinishedSquareMeters > 0) {
    lines.push({
      id: "dak-roof40-unfinished",
      label: "Aanvullend dakdeel PIF ROOF40 onafgewerkt",
      productName: "PIF ROOF40 onafgewerkt",
      squareMeters: combo.unfinishedSquareMeters,
      amount: Math.round(combo.unfinishedSquareMeters * combo.ratesPerM2.roof40 * 100) / 100
    });
  }
  return lines;
}
