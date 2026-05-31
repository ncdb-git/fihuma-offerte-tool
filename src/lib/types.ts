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

export type DakCombinationRates = {
  isofast: number;
  roof35: number;
  roof40: number;
};

export type DakCombination = {
  unfinishedProduct: DakUnfinishedProduct;
  unfinishedSquareMeters: number;
  ratesPerM2: DakCombinationRates;
};

export type DakInvestmentLine = {
  id: string;
  label: string;
  productName: string;
  squareMeters: number;
  amount: number;
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
};
