import type {
  CalculationWarning,
  IsdeSubsidyStatus,
  Measure,
  MeasureFinancialResult,
  Proposal,
  ProposalFinancialTotals,
  SubsidyCalculationResult
} from "@/lib/types";
import { calculateIsdeForMeasure, measureIsdeEligible } from "@/lib/subsidy-engine/isde";
import { buildSubsidyLines, extractNipEuro } from "@/lib/subsidy-engine/nip";
import type { SubsidyEngineContext } from "@/lib/subsidy-engine/types";

function roundEuro(value: number) {
  return Math.round(value * 100) / 100;
}

function measureExtraWorkTotal(measure: Measure) {
  return measure.extraWork.reduce((sum, line) => sum + line.amount, 0);
}

function measureAdjustmentsTotal(measure: Measure) {
  return (measure.adjustments ?? []).reduce((sum, line) => sum + line.amount, 0);
}

function measureBrutoTotal(measure: Measure) {
  return measure.grossInvestment + measureExtraWorkTotal(measure);
}

function measureHasPricing(measure: Measure) {
  return measure.grossInvestment > 0 || measureExtraWorkTotal(measure) > 0 || measureAdjustmentsTotal(measure) > 0;
}

function formatIsdeDescription(isde: ReturnType<typeof calculateIsdeForMeasure>) {
  const rate = isde.rate.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `ISDE subsidie (${isde.eligibleSquareMeters} m² × € ${rate})`;
}

function resolveEffectiveStatus(
  measure: Measure,
  combinedEligibleCount: number
): IsdeSubsidyStatus {
  if (measure.subsidyStatus === "double-previous") return "double-previous";
  if (combinedEligibleCount >= 2) return "double-fihuma";
  return measure.subsidyStatus ?? "single";
}

export function countCombinedEligibleMeasures(proposals: Proposal[]) {
  return proposals.reduce((count, proposal) => {
    const measure = proposal.measures[0];
    if (!measure || !measureHasPricing(measure)) return count;
    if (!measureIsdeEligible(measure)) return count;
    return count + 1;
  }, 0);
}

export function resolveCombinationProposals(proposal: Proposal, context?: SubsidyEngineContext): Proposal[] {
  const combinationIds = context?.combinationProposalIds ?? proposal.subsidyCombinationProposalIds ?? [];
  const siblings = context?.siblingProposals ?? [];
  const selectedSiblings = siblings.filter((entry) => combinationIds.includes(entry.id));
  return [proposal, ...selectedSiblings];
}

function buildWarnings(measure: Measure, netInvestment: number, isde: ReturnType<typeof calculateIsdeForMeasure>, nipEuro: number): CalculationWarning[] {
  const warnings: CalculationWarning[] = [];

  if (isde.isTooSmall) {
    warnings.push({
      code: "ISDE_BELOW_MINIMUM_M2",
      measureId: measure.id,
      message: `Minimale oppervlakte voor ISDE is ${isde.minM2} m².`,
      severity: "warning"
    });
  }
  if (isde.isCapped) {
    warnings.push({
      code: "ISDE_CAPPED_AT_MAX_M2",
      measureId: measure.id,
      message: `ISDE is berekend over maximaal ${isde.maxM2} m².`,
      severity: "info"
    });
  }
  if (nipEuro > 0) {
    warnings.push({
      code: "NIP_MANUAL_OVERRIDE",
      measureId: measure.id,
      message: "NIP is handmatig ingevuld.",
      severity: "info"
    });
  }
  if (netInvestment === 0) {
    warnings.push({
      code: "NET_INVESTMENT_ZERO",
      measureId: measure.id,
      message: "Netto investering is € 0,00.",
      severity: "warning"
    });
  } else if (netInvestment < 0) {
    warnings.push({
      code: "NET_INVESTMENT_NEGATIVE",
      measureId: measure.id,
      message: "Netto investering is negatief (subsidie hoger dan bruto).",
      severity: "warning"
    });
  }

  return warnings;
}

export function calculateMeasureFinancials(
  measure: Measure,
  options: {
    nipEuro?: number;
    effectiveStatus: IsdeSubsidyStatus;
    combinedEligibleCount: number;
  }
): MeasureFinancialResult | null {
  if (!measureHasPricing(measure)) return null;

  const nipEuro = options.nipEuro ?? extractNipEuro(measure);
  const effectiveStatus =
    options.effectiveStatus === "double-fihuma" && measure.subsidyStatus !== "double-previous"
      ? "double-fihuma"
      : resolveEffectiveStatus(measure, options.combinedEligibleCount);

  const isde = calculateIsdeForMeasure(measure, effectiveStatus);
  const extraWork = measureExtraWorkTotal(measure);
  const adjustments = measureAdjustmentsTotal(measure);
  const bruto = measureBrutoTotal(measure);
  const payableToFihuma = bruto + adjustments;
  const subsidies = buildSubsidyLines(isde.amount, nipEuro, formatIsdeDescription(isde));
  const totalSubsidies = roundEuro(subsidies.reduce((sum, line) => sum + Math.abs(line.amount), 0));
  const netInvestment = roundEuro(payableToFihuma + subsidies.reduce((sum, line) => sum + line.amount, 0));

  return {
    measureId: measure.id,
    measureType: measure.type,
    bruto: {
      grossInvestment: measure.grossInvestment,
      extraWork,
      adjustments,
      bruto,
      payableToFihuma
    },
    isde,
    nipEuro,
    subsidies,
    totalSubsidies,
    netInvestment
  };
}

export function calculateProposalFinancials(
  proposal: Proposal,
  context?: SubsidyEngineContext
): SubsidyCalculationResult {
  const combinationIds = context?.combinationProposalIds ?? proposal.subsidyCombinationProposalIds ?? [];
  const combinedProposals = resolveCombinationProposals(proposal, context);
  const combinedEligibleCount = countCombinedEligibleMeasures(combinedProposals);
  const effectiveStatus: IsdeSubsidyStatus = combinedEligibleCount >= 2 ? "double-fihuma" : "single";

  const measureResults: MeasureFinancialResult[] = [];
  const warnings: CalculationWarning[] = [];

  for (const measure of proposal.measures) {
    const nipOverride = extractNipEuro(measure);
    const result = calculateMeasureFinancials(measure, {
      nipEuro: nipOverride,
      effectiveStatus,
      combinedEligibleCount
    });
    if (!result) continue;

    measureResults.push(result);
    warnings.push(...buildWarnings(measure, result.netInvestment, result.isde, result.nipEuro));

    if (combinedEligibleCount >= 2 && measure.subsidyStatus !== "double-previous") {
      warnings.push({
        code: "DOUBLE_STATUS_COMBINED",
        measureId: measure.id,
        message: "Verhoogd ISDE-tarief door combinatie met geselecteerde offerte(s).",
        severity: "info"
      });
    }
  }

  const totals: ProposalFinancialTotals = {
    bruto: roundEuro(measureResults.reduce((sum, entry) => sum + entry.bruto.bruto, 0)),
    adjustments: roundEuro(measureResults.reduce((sum, entry) => sum + entry.bruto.adjustments, 0)),
    payableToFihuma: roundEuro(measureResults.reduce((sum, entry) => sum + entry.bruto.payableToFihuma, 0)),
    isde: roundEuro(measureResults.reduce((sum, entry) => sum + entry.isde.amount, 0)),
    nip: roundEuro(measureResults.reduce((sum, entry) => sum + entry.nipEuro, 0)),
    totalSubsidies: roundEuro(measureResults.reduce((sum, entry) => sum + entry.totalSubsidies, 0)),
    netInvestment: roundEuro(measureResults.reduce((sum, entry) => sum + entry.netInvestment, 0)),
    isNegative: false,
    isZero: false
  };
  totals.isNegative = totals.netInvestment < 0;
  totals.isZero = totals.netInvestment === 0;

  if (totals.isZero) {
    warnings.push({
      code: "NET_INVESTMENT_ZERO",
      message: "Totale netto investering is € 0,00.",
      severity: "warning"
    });
  } else if (totals.isNegative) {
    warnings.push({
      code: "NET_INVESTMENT_NEGATIVE",
      message: "Totale netto investering is negatief.",
      severity: "warning"
    });
  }

  return {
    measures: measureResults,
    totals,
    combinedMeasureCount: combinedEligibleCount,
    combinationProposalIds: combinationIds,
    warnings
  };
}

/** Gecombineerde berekening over meerdere geselecteerde offertes.
 *  Bedoeld voor de toekomstige verzendflow ("Versturen naar klant"),
 *  niet voor de per-offerte configurator. */
export function calculateCombinedFinancials(
  primaryProposal: Proposal,
  selectedProposals: Proposal[],
  context?: Omit<SubsidyEngineContext, "siblingProposals" | "combinationProposalIds">
) {
  const combinationIds = selectedProposals.map((entry) => entry.id);
  const primary = calculateProposalFinancials(primaryProposal, {
    ...context,
    combinationProposalIds: combinationIds,
    siblingProposals: selectedProposals.filter((entry) => entry.id !== primaryProposal.id)
  });

  const perProposal = selectedProposals
    .filter((entry) => entry.id !== primaryProposal.id)
    .map((entry) =>
      calculateProposalFinancials(entry, {
        ...context,
        combinationProposalIds: combinationIds,
        siblingProposals: [primaryProposal, ...selectedProposals.filter((item) => item.id !== entry.id)]
      })
    );

  return { primary, perProposal, combinationIds };
}
