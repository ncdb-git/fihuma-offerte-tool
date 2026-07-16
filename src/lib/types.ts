export type ProposalStatus =
  | "Nieuw vanuit Pipedrive"
  | "In bewerking"
  | "Offerte gegenereerd"
  | "Geüpload naar Pipedrive"
  | "Gearchiveerd"
  | "nog te maken"
  | "concept"
  | "Concept vanuit Pipedrive"
  | "Bijgewerkt vanuit Pipedrive"
  | "offerte gegenereerd"
  | "verstuurd"
  | "archived"
  | "gearchiveerd";

export type MeasureType = "spouwmuur" | "vloer" | "bodem" | "dak";

export type IsdeSubsidyStatus = "single" | "double-fihuma" | "double-previous";

export type AgreementApprovalMethod = "digital" | "prior-form";

export type Advisor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
};

export type Salutation = "dhr." | "mevr." | "dhr. en mevr." | "familie";

export type Customer = {
  salutation: Salutation;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  pipedriveDealId: string;
  pipedriveDealLink: string;
};

export type MoneyLine = {
  id: string;
  description: string;
  amount: number;
};

/** Onafgewerkt dakdeel naast PIF Isofast (knieschot, laag dak, etc.). */
export type DakUnfinishedProduct = "none" | "roof35" | "roof40";

/** Onafgewerkt dakdeel naast PIF Isofast — vast offertebedrag + m² voor ISDE. */
export type DakCombination = {
  unfinishedProduct: DakUnfinishedProduct;
  /** m² onafgewerkt deel (telt mee voor ISDE-subsidie). */
  unfinishedSquareMeters: number;
  /** Vaste quote voor het onafgewerkt deel (€), als meerwerkregel. */
  unfinishedQuoteAmount: number;
};

export type DakInvestmentLine = {
  id: string;
  label: string;
  productName: string;
  squareMeters: number;
  amount: number;
};

export type CalculationSnapshotTrigger = "pdf_generate" | "email_send" | "pipedrive_upload";

export type CalculationWarningCode =
  | "NET_INVESTMENT_NEGATIVE"
  | "NET_INVESTMENT_ZERO"
  | "ISDE_BELOW_MINIMUM_M2"
  | "ISDE_CAPPED_AT_MAX_M2"
  | "NIP_MANUAL_OVERRIDE"
  | "DOUBLE_STATUS_COMBINED";

export type CalculationWarning = {
  code: CalculationWarningCode;
  measureId?: string;
  message: string;
  severity: "info" | "warning";
};

export type IsdeBreakdown = {
  status: IsdeSubsidyStatus;
  squareMeters: number;
  eligibleSquareMeters: number;
  rate: number;
  amount: number;
  isCapped: boolean;
  isTooSmall: boolean;
  minM2: number;
  maxM2: number;
  explanation: string;
};

export type MeasureFinancialResult = {
  measureId: string;
  measureType: MeasureType;
  bruto: {
    grossInvestment: number;
    extraWork: number;
    adjustments: number;
    bruto: number;
    payableToFihuma: number;
  };
  isde: IsdeBreakdown;
  nipEuro: number;
  subsidies: MoneyLine[];
  totalSubsidies: number;
  netInvestment: number;
};

export type ProposalFinancialTotals = {
  bruto: number;
  adjustments: number;
  payableToFihuma: number;
  isde: number;
  nip: number;
  totalSubsidies: number;
  netInvestment: number;
  isNegative: boolean;
  isZero: boolean;
};

export type SubsidyCalculationResult = {
  measures: MeasureFinancialResult[];
  totals: ProposalFinancialTotals;
  combinedMeasureCount: number;
  combinationProposalIds: string[];
  warnings: CalculationWarning[];
};

export type CalculationSnapshot = {
  id: string;
  engineVersion: string;
  tariffSetVersion: string;
  calculatedAt: string;
  trigger: CalculationSnapshotTrigger;
  combinationProposalIds: string[];
  result: SubsidyCalculationResult;
};

export type Measure = {
  id: string;
  type: MeasureType;
  title: string;
  productName: string;
  application: string;
  squareMeters: number;
  description: string;
  rcValue: string;
  warranty: string;
  lifespan: string;
  benefits: string[];
  specifications: string[];
  workDescription: string;
  extraWork: MoneyLine[];
  /** Korting (negatief) of toeslag (positief), los van meerwerk. */
  adjustments?: MoneyLine[];
  subsidies: MoneyLine[];
  subsidyStatus?: IsdeSubsidyStatus;
  grossInvestment: number;
  netInvestment: number;
  /** Alleen bij dak + PIF Isofast: combinatie met onafgewerkt ROOF-deel. */
  dakCombination?: DakCombination;
};

export type Proposal = {
  id: string;
  status: ProposalStatus;
  label: "Fihuma Collectief" | "Fihuma Isolatie" | "Kozijn Station";
  title: string;
  subtitle: string;
  createdAt: string;
  /** Laatste CRM-sync (ISO); bepaalt of Pipedrive opnieuw wordt opgehaald. */
  pipedriveSyncedAt?: string | null;
  /** Optioneel: pad naar sfeerfoto in /public, bv. `/cover-sfeer.jpg` (geen tekst in beeld). */
  coverSfeerImageSrc?: string | null;
  /** Vrije offertenummer-weergave; valt terug op `id`. */
  quoteNumber?: string | null;
  advisor: Advisor;
  customer: Customer;
  situation: {
    inspection: string;
    homeInfo: string;
    summary: string;
    buildingType: string;
    buildYear: string;
    isolationTargets: string;
    inspectionDate: string;
  };
  introText: string;
  /** Korte intro op de werkwijze-pagina (aanvulling op vaste alinea). */
  workflowIntro: string;
  whyFihuma: string[];
  clauses: string[];
  notes: string;
  agreement: {
    paymentTerms: string;
    subsidyClause: string;
    nextSteps: string;
    termsReference: string;
    approvalMethod: AgreementApprovalMethod;
    priorApprovalDate?: string | null;
  };
  measures: Measure[];
  /** Offerte-ids voor gezamenlijke ISDE (alleen gezet in de toekomstige verzendflow). */
  subsidyCombinationProposalIds?: string[];
  /** Vastgelegde berekening bij PDF/e-mail/Pipedrive (bron voor dashboard/PDF). */
  calculationSnapshot?: CalculationSnapshot;
};
