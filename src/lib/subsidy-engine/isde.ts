import { dakSquareMetersForSubsidy } from "@/lib/dak-combination";
import type { IsdeSubsidyStatus, Measure } from "@/lib/types";
import { ISDE_TARIFFS_2026 } from "@/lib/subsidy-engine/tariffs-2026";
import type { IsdeBreakdown } from "@/lib/subsidy-engine/types";

export function isdeSubsidyExplanation(status: IsdeSubsidyStatus) {
  if (status === "double-fihuma") {
    return "Voor deze maatregel is rekening gehouden met de verhoogde ISDE-subsidie voor meerdere verduurzamingsmaatregelen binnen dezelfde woning.";
  }
  if (status === "double-previous") {
    return "Voor deze maatregel is rekening gehouden met de verhoogde ISDE-subsidie doordat deze gecombineerd wordt met een eerder uitgevoerde verduurzamingsmaatregel.";
  }
  return "Voor deze maatregel is een ISDE-subsidie van toepassing op basis van een uitgevoerde verduurzamingsmaatregel.";
}

export function isdeSquareMeters(measure: Pick<Measure, "type" | "squareMeters" | "dakCombination">) {
  let squareMeters = Math.max(0, Number(measure.squareMeters) || 0);
  if (measure.type === "dak" && measure.dakCombination) {
    squareMeters = dakSquareMetersForSubsidy(measure as Measure);
  }
  return squareMeters;
}

export function calculateIsdeForMeasure(
  measure: Pick<Measure, "type" | "squareMeters" | "subsidyStatus" | "dakCombination">,
  effectiveStatus: IsdeSubsidyStatus
): IsdeBreakdown {
  const rule = ISDE_TARIFFS_2026[measure.type];
  const squareMeters = isdeSquareMeters(measure);
  const eligibleSquareMeters = squareMeters < rule.minM2 ? 0 : Math.min(squareMeters, rule.maxM2);
  const rate = effectiveStatus === "single" ? rule.singleRate : rule.doubleRate;
  const amount = Math.round(eligibleSquareMeters * rate * 100) / 100;

  return {
    status: effectiveStatus,
    squareMeters,
    eligibleSquareMeters,
    rate,
    amount,
    isCapped: squareMeters > rule.maxM2,
    isTooSmall: squareMeters > 0 && squareMeters < rule.minM2,
    minM2: rule.minM2,
    maxM2: rule.maxM2,
    explanation: isdeSubsidyExplanation(effectiveStatus)
  };
}

export function measureIsdeEligible(measure: Pick<Measure, "type" | "squareMeters" | "dakCombination">) {
  const squareMeters = isdeSquareMeters(measure);
  const rule = ISDE_TARIFFS_2026[measure.type];
  return squareMeters >= rule.minM2;
}
