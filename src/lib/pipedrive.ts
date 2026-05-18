import {
  advisors,
  applyAutomaticIsdeSubsidy,
  applyProductToMeasure,
  createGuidedProposal,
  createBlankMeasure,
  ISDE_SUBSIDY_STATUS_OPTIONS,
  isolationLabelForType,
  MAIN_PRODUCTS
} from "@/lib/proposal-engine";
import { Customer, IsdeSubsidyStatus, MeasureType, Proposal } from "@/lib/types";

export const pipedriveBaseUrl = process.env.PIPEDRIVE_COMPANY_DOMAIN
  ? `https://${process.env.PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1`
  : "https://api.pipedrive.com/v1";

export const pipedriveFieldMap = {
  klantNaam: "person.name",
  email: "person.email[0].value",
  telefoon: "person.phone[0].value",
  adres: "deal.address",
  postcode: "deal.address_postal_code",
  woonplaats: "deal.address_locality",
  maatregel: "deal.custom_field_maatregel",
  oppervlakte: "deal.custom_field_oppervlakte",
  subsidieOptie: "deal.custom_field_subsidie_optie"
} as const;

function token() {
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    throw new Error("PIPEDRIVE_API_TOKEN is not configured");
  }
  return process.env.PIPEDRIVE_API_TOKEN;
}

function dealUrl(dealId: string) {
  const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN;
  return domain ? `https://${domain}.pipedrive.com/deal/${dealId}` : `https://app.pipedrive.com/deal/${dealId}`;
}

function getPath(source: unknown, path: string): unknown {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>((value, key) => {
      if (value && typeof value === "object" && key in value) {
        return (value as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
}

function textValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) return textValue((value as { value: unknown }).value);
  return "";
}

function idFromReference(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

async function pipedriveGet<T>(path: string): Promise<T> {
  const response = await fetch(`${pipedriveBaseUrl}${path}${path.includes("?") ? "&" : "?"}api_token=${token()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Pipedrive request mislukt (${path}): ${response.status}`);
  }
  const payload = await response.json();
  return payload.data as T;
}

type PipedriveDeal = Record<string, unknown>;
type PipedrivePerson = Record<string, unknown>;
type PipedriveOrganization = Record<string, unknown>;

export async function fetchPipedriveDealBundle(dealId: string) {
  const deal = await pipedriveGet<PipedriveDeal>(`/deals/${dealId}`);
  const personId = idFromReference(deal.person_id);
  const organizationId = idFromReference(deal.org_id);
  const [person, organization] = await Promise.all([
    personId ? pipedriveGet<PipedrivePerson>(`/persons/${personId}`).catch(() => (deal.person_id as PipedrivePerson) ?? {}) : Promise.resolve((deal.person_id as PipedrivePerson) ?? {}),
    organizationId ? pipedriveGet<PipedriveOrganization>(`/organizations/${organizationId}`).catch(() => (deal.org_id as PipedriveOrganization) ?? {}) : Promise.resolve((deal.org_id as PipedriveOrganization) ?? {})
  ]);
  return { deal, person, organization };
}

function measureTypeFromPipedrive(value: string): MeasureType {
  const normalized = value.toLowerCase();
  if (normalized.includes("spouw")) return "spouwmuur";
  if (normalized.includes("bodem")) return "bodem";
  if (normalized.includes("dak")) return "dak";
  return "vloer";
}

function subsidyStatusFromPipedrive(value: string): IsdeSubsidyStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes("eerder")) return "double-previous";
  if (normalized.includes("dubbel") || normalized.includes("meerdere")) return "double-fihuma";
  return ISDE_SUBSIDY_STATUS_OPTIONS[0].id;
}

export function isTargetOfferStage(stageId: unknown) {
  const targetStage = process.env.PIPEDRIVE_OFFERTE_STAGE_ID;
  return Boolean(targetStage && String(stageId) === targetStage);
}

export function mapPipedriveBundleToProposal(dealId: string, bundle: Awaited<ReturnType<typeof fetchPipedriveDealBundle>>): Proposal {
  const source = { deal: bundle.deal, person: bundle.person, organization: bundle.organization };
  const measureType = measureTypeFromPipedrive(textValue(getPath(source, pipedriveFieldMap.maatregel)));
  const squareMeters = Number(textValue(getPath(source, pipedriveFieldMap.oppervlakte))) || createBlankMeasure(measureType).squareMeters;
  const subsidyStatus = subsidyStatusFromPipedrive(textValue(getPath(source, pipedriveFieldMap.subsidieOptie)));
  const firstProduct = MAIN_PRODUCTS[measureType][0]?.key ?? "pif35";
  const baseMeasure = createBlankMeasure(measureType);
  const measure = applyAutomaticIsdeSubsidy(applyProductToMeasure({ ...baseMeasure, squareMeters, subsidyStatus }, firstProduct));
  const ownerEmail = textValue(getPath(source, "deal.owner_id.email"));
  const advisor = advisors.find((item) => item.email.toLowerCase() === ownerEmail.toLowerCase()) ?? advisors[0];
  const proposal = createGuidedProposal(dealId);

  return {
    ...proposal,
    id: `FIH-${dealId}`,
    quoteNumber: `FIH-${dealId}`,
    status: "Concept vanuit Pipedrive",
    advisor,
    customer: {
      salutation: "familie",
      name: textValue(getPath(source, pipedriveFieldMap.klantNaam)) || textValue(getPath(source, "organization.name")) || textValue(getPath(source, "deal.title")) || "Onbekende klant",
      address: textValue(getPath(source, pipedriveFieldMap.adres)) || textValue(getPath(source, "organization.address")),
      postalCode: textValue(getPath(source, pipedriveFieldMap.postcode)) || textValue(getPath(source, "organization.address_postal_code")),
      city: textValue(getPath(source, pipedriveFieldMap.woonplaats)) || textValue(getPath(source, "organization.address_locality")),
      email: textValue(getPath(source, pipedriveFieldMap.email)),
      phone: textValue(getPath(source, pipedriveFieldMap.telefoon)),
      pipedriveDealId: dealId,
      pipedriveDealLink: dealUrl(dealId)
    },
    situation: {
      ...proposal.situation,
      isolationTargets: isolationLabelForType(measureType),
      summary: "Dit offerteconcept is automatisch aangemaakt vanuit Pipedrive. Controleer de gegevens en vul de offerte waar nodig aan."
    },
    measures: [measure]
  };
}

export async function fetchPipedriveCustomer(dealId: string): Promise<Customer> {
  const { deal, person, organization } = await fetchPipedriveDealBundle(dealId);

  return {
    salutation: "familie",
    name: textValue(person.name) || textValue(organization.name) || textValue(deal.title) || "Onbekende klant",
    address: textValue(organization.address),
    postalCode: textValue(organization.address_postal_code),
    city: textValue(organization.address_locality),
    email: textValue(getPath({ person }, "person.email[0].value")),
    phone: textValue(getPath({ person }, "person.phone[0].value")),
    pipedriveDealId: dealId,
    pipedriveDealLink: dealUrl(dealId)
  };
}

export async function uploadProposalPdf(proposal: Proposal, pdf: Blob, filename?: string) {
  const form = new FormData();
  form.append("file", pdf, filename ?? `${proposal.id}-offerte.pdf`);
  form.append("deal_id", proposal.customer.pipedriveDealId);

  const response = await fetch(`${pipedriveBaseUrl}/files?api_token=${token()}`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    throw new Error(`Pipedrive PDF upload mislukt: ${response.status}`);
  }

  return response.json();
}

export async function addDealNote(dealId: string, content: string) {
  const response = await fetch(`${pipedriveBaseUrl}/notes?api_token=${token()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deal_id: dealId, content })
  });
  if (!response.ok) throw new Error(`Pipedrive note toevoegen mislukt: ${response.status}`);
  return response.json();
}

export async function markDealOfferReady(dealId: string) {
  const labelId = process.env.PIPEDRIVE_OFFER_READY_LABEL_ID;
  if (!labelId) return null;
  const response = await fetch(`${pipedriveBaseUrl}/deals/${dealId}?api_token=${token()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: labelId })
  });
  if (!response.ok) throw new Error(`Pipedrive deal label bijwerken mislukt: ${response.status}`);
  return response.json();
}
