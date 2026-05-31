import { dakTotalSquareMeters, formatDakProductSummary, isIsofastProductKey } from "@/lib/dak-combination";
import {
  getProductKeyForMeasure,
  isMeasureDraft,
  measureHasPricing,
  MEASURE_TYPE_LABELS,
  money,
  proposalDashboardNetTotal
} from "@/lib/proposal-engine";
import type { Measure, Proposal } from "@/lib/types";

export const CONFIGURATOR_STEP_COUNT = 6;

export type ConfiguratorProgressTone = "danger" | "warning" | "success";

export type ConfiguratorProgress = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
  label: "Nog te maken" | "Deels ingevuld" | "Compleet";
  tone: ConfiguratorProgressTone;
  emoji: string;
};

export type DashboardConceptSnapshot = {
  measureTypeLabel: string;
  squareMetersLabel: string;
  productName: string;
  amountLabel: string;
  progress: ConfiguratorProgress;
};

function primaryMeasure(proposal: Proposal): Measure | null {
  return proposal.measures[0] ?? null;
}

function stepCompletions(proposal: Proposal, measure: Measure | null): boolean[] {
  const customer = proposal.customer;
  const agreement = proposal.agreement;

  return [
    Boolean(proposal.advisor?.name?.trim()),
    Boolean(customer.name?.trim()),
    Boolean(measure && measure.squareMeters > 0),
    Boolean(measure && !isMeasureDraft(measure)),
    Boolean(measure && measure.grossInvestment > 0),
    Boolean(
      measure &&
        measure.grossInvestment > 0 &&
        Boolean(agreement.paymentTerms?.trim()) &&
        Boolean(agreement.subsidyClause?.trim()) &&
        Boolean(agreement.approvalMethod)
    )
  ];
}

export function evaluateConfiguratorProgress(proposal: Proposal): ConfiguratorProgress {
  const measure = primaryMeasure(proposal);
  const steps = stepCompletions(proposal, measure);
  const completedSteps = steps.filter(Boolean).length;
  const totalSteps = CONFIGURATOR_STEP_COUNT;
  const percent = Math.round((completedSteps / totalSteps) * 100);

  if (completedSteps >= totalSteps) {
    return { completedSteps, totalSteps, percent: 100, label: "Compleet", tone: "success", emoji: "🟢" };
  }
  if (completedSteps <= 2) {
    return { completedSteps, totalSteps, percent, label: "Nog te maken", tone: "danger", emoji: "🔴" };
  }
  return { completedSteps, totalSteps, percent, label: "Deels ingevuld", tone: "warning", emoji: "🟡" };
}

export function buildDashboardConceptSnapshot(proposal: Proposal): DashboardConceptSnapshot {
  const measure = primaryMeasure(proposal);
  const progress = evaluateConfiguratorProgress(proposal);
  const netTotal = proposalDashboardNetTotal(proposal);

  const measureTypeLabel = measure ? MEASURE_TYPE_LABELS[measure.type] : "Maatregel nog te kiezen";
  const productKey = measure ? getProductKeyForMeasure(measure) : "";
  const totalM2 = measure && measure.squareMeters > 0 ? dakTotalSquareMeters(measure) : 0;
  const squareMetersLabel = totalM2 > 0 ? `${totalM2} m²` : "— m²";
  const productName =
    measure && !isMeasureDraft(measure)
      ? measure.type === "dak" && isIsofastProductKey(productKey)
        ? formatDakProductSummary(measure, productKey)
        : measure.productName.trim() || "—"
      : "Nog te kiezen";

  let amountLabel = "—";
  if (netTotal !== null) {
    amountLabel = money(netTotal);
  } else if (measure && measureHasPricing(measure)) {
    amountLabel = money(measure.netInvestment);
  }

  return {
    measureTypeLabel,
    squareMetersLabel,
    productName,
    amountLabel,
    progress
  };
}

export function progressToneClasses(tone: ConfiguratorProgressTone) {
  if (tone === "success") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
      bar: "bg-emerald-500"
    };
  }
  if (tone === "warning") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      bar: "bg-amber-500"
    };
  }
  return {
    badge: "border-red-200 bg-red-50 text-red-900",
    bar: "bg-red-500"
  };
}
