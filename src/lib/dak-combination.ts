import type { DakCombination, DakInvestmentLine, DakUnfinishedProduct, Measure } from "@/lib/types";

export const ISOFAST_PRODUCT_KEY = "isofast35";

/** Vaste extraWork-regel voor onafgewerkt dakdeel (niet handmatig verwijderen). */
export const DAK_UNFINISHED_EXTRA_ID = "dak-unfinished-combo";

/** Alleen voor migratie van oude m²-tarieven. */
const LEGACY_RATES = { roof35: 38, roof40: 40 } as const;

export function isIsofastProductKey(productKey: string) {
  return productKey === ISOFAST_PRODUCT_KEY;
}

export function defaultDakCombination(): DakCombination {
  return {
    unfinishedProduct: "none",
    unfinishedSquareMeters: 0,
    unfinishedQuoteAmount: 0
  };
}

export function normalizeDakCombination(measure: Measure): DakCombination {
  const raw = measure.dakCombination;
  if (!raw) return defaultDakCombination();

  const unfinishedProduct = raw.unfinishedProduct ?? "none";
  const unfinishedSquareMeters = Math.max(0, Number(raw.unfinishedSquareMeters) || 0);
  let unfinishedQuoteAmount = Math.max(0, Number(raw.unfinishedQuoteAmount) || 0);

  // Migratie: oude m² × tarief → vast bedrag (behoud m²)
  if (
    unfinishedQuoteAmount <= 0 &&
    unfinishedProduct !== "none" &&
    unfinishedSquareMeters > 0 &&
    "ratesPerM2" in raw
  ) {
    const legacy = raw as {
      ratesPerM2?: { roof35?: number; roof40?: number };
    };
    const rate =
      unfinishedProduct === "roof35"
        ? Number(legacy.ratesPerM2?.roof35) || LEGACY_RATES.roof35
        : Number(legacy.ratesPerM2?.roof40) || LEGACY_RATES.roof40;
    unfinishedQuoteAmount = Math.round(unfinishedSquareMeters * rate * 100) / 100;
  }

  return {
    unfinishedProduct,
    unfinishedSquareMeters: unfinishedProduct === "none" ? 0 : unfinishedSquareMeters,
    unfinishedQuoteAmount: unfinishedProduct === "none" ? 0 : unfinishedQuoteAmount
  };
}

/** Totaal m² voor ISDE: Isofast + onafgewerkt dakdeel. */
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

export function unfinishedExtraWorkLabel(product: DakUnfinishedProduct, squareMeters = 0) {
  if (product === "none") return "";
  const base = `Aanvullend dakdeel ${unfinishedProductLabel(product)}`;
  return squareMeters > 0 ? `${base} (${squareMeters} m²)` : base;
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

/** Voegt onafgewerkt dakdeel toe als vaste meerwerkregel (quote €, geen m²-prijs). */
export function syncDakCombinationExtraWork(measure: Measure, moduleExtraWork: { id: string; description: string; amount: number }[]) {
  const combo = normalizeDakCombination(measure);
  const withoutCombo = moduleExtraWork.filter((line) => line.id !== DAK_UNFINISHED_EXTRA_ID);

  if (combo.unfinishedProduct === "none" || combo.unfinishedQuoteAmount <= 0) {
    return withoutCombo;
  }

  return [
    ...withoutCombo,
    {
      id: DAK_UNFINISHED_EXTRA_ID,
      description: unfinishedExtraWorkLabel(combo.unfinishedProduct, combo.unfinishedSquareMeters),
      amount: combo.unfinishedQuoteAmount
    }
  ];
}

export function getDakInvestmentLines(measure: Measure, productKey: string): DakInvestmentLine[] | null {
  if (measure.type !== "dak" || !isIsofastProductKey(productKey) || measure.grossInvestment <= 0) {
    return null;
  }

  return [
    {
      id: "dak-isofast",
      label: "Dakisolatie PIF Isofast",
      productName: "PIF Isofast",
      squareMeters: measure.squareMeters,
      amount: measure.grossInvestment
    }
  ];
}
