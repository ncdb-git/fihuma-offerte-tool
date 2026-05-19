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
import { resolveCustomerAddressFromBundle } from "@/lib/pipedrive-address";
import { Customer, IsdeSubsidyStatus, MeasureType, Proposal } from "@/lib/types";

import { pipedriveBaseUrl, pipedriveToken } from "@/lib/pipedrive-config";

export { pipedriveBaseUrl } from "@/lib/pipedrive-config";

/** Centrale field mapping — custom field hashes via env (zie .env.example). */
export function getPipedriveFieldMap() {
  const dealField = (envKey: string, fallback: string) => {
    const hash = process.env[envKey]?.trim();
    return hash ? `deal.${hash}` : fallback;
  };

  return {
    klantNaam: "person.name",
    email: "person.email[0].value",
    telefoon: "person.phone[0].value",
    adres: dealField("PIPEDRIVE_FIELD_ADRES", "person.postal_address_route"),
    postcode: dealField("PIPEDRIVE_FIELD_POSTCODE", "person.postal_address_postal_code"),
    woonplaats: dealField("PIPEDRIVE_FIELD_WOONPLAATS", "person.postal_address_locality"),
    maatregel: dealField("PIPEDRIVE_FIELD_MAATREGEL", "deal.custom_field_maatregel"),
    oppervlakte: dealField("PIPEDRIVE_FIELD_OPPERVLAKTE", "deal.custom_field_oppervlakte"),
    subsidieOptie: dealField("PIPEDRIVE_FIELD_SUBSIDIE", "deal.custom_field_subsidie_optie")
  } as const;
}

/** @deprecated Gebruik getPipedriveFieldMap() — adres/postcode/plaats via resolveCustomerAddressFromBundle. */
export const pipedriveFieldMap = getPipedriveFieldMap();

function token() {
  return pipedriveToken();
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

/** Pipedrive koppelt person/org/user vaak als `{ value: 123, name: "…" }` — niet als `{ id: … }`. */
function idFromReference(value: unknown): string {
  if (typeof value === "number" && !Number.isNaN(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if ("value" in record) {
    const nested = idFromReference(record.value);
    if (nested) return nested;
  }
  if ("id" in record) {
    const id = record.id;
    if (typeof id === "number" && !Number.isNaN(id)) return String(id);
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "";
}

function pipedriveV2BaseUrl() {
  const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN?.trim();
  return domain ? `https://${domain}.pipedrive.com/api/v2` : null;
}

/** API v2 levert custom fields soms alleen onder `custom_fields` — flatten naar v1-stijl keys. */
async function fetchPersonV2Flat(personId: string): Promise<PipedrivePerson> {
  const base = pipedriveV2BaseUrl();
  if (!base) return {};

  const response = await fetch(`${base}/persons/${personId}?api_token=${token()}`, { cache: "no-store" });
  if (!response.ok) {
    console.warn("[pipedrive] v2 person ophalen mislukt", { personId, status: response.status });
    return {};
  }

  const payload = await response.json();
  const data = (payload.data ?? payload) as PipedrivePerson;
  const customFields = data.custom_fields;
  if (customFields && typeof customFields === "object" && !Array.isArray(customFields)) {
    return { ...data, ...(customFields as Record<string, unknown>) };
  }
  return data;
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

  if (!personId && deal.person_id) {
    console.warn("[pipedrive] geen personId uit deal.person_id", { dealId, person_id: deal.person_id });
  }

  const [personFromApi, personFromV2, personFromDeal, organization] = await Promise.all([
    personId ? pipedriveGet<PipedrivePerson>(`/persons/${personId}`).catch((error) => {
      console.warn("[pipedrive] GET /persons mislukt", { dealId, personId, error });
      return {};
    }) : Promise.resolve({}),
    personId ? fetchPersonV2Flat(personId) : Promise.resolve({}),
    pipedriveGet<PipedrivePerson>(`/deals/${dealId}/person`).catch(() => ({})),
    organizationId ? pipedriveGet<PipedriveOrganization>(`/organizations/${organizationId}`).catch(() => ({})) : Promise.resolve({})
  ]);

  // Volgorde: deal-person endpoint → v1 person → v2 person (meest complete custom fields)
  const person = { ...(deal.person_id as PipedrivePerson), ...personFromDeal, ...personFromApi, ...personFromV2 };

  return { deal, person, organization, meta: { personId, organizationId } };
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

export async function mapPipedriveBundleToProposal(dealId: string, bundle: Awaited<ReturnType<typeof fetchPipedriveDealBundle>>): Promise<Proposal> {
  const source = { deal: bundle.deal, person: bundle.person, organization: bundle.organization };
  const fields = getPipedriveFieldMap();
  const addressFields = await resolveCustomerAddressFromBundle(bundle);

  console.info("[pipedrive] customer address resolved", {
    dealId,
    address: addressFields.address,
    postalCode: addressFields.postalCode,
    city: addressFields.city,
    sources: addressFields.sources,
    fieldKeys: addressFields.debug.fieldKeys
  });

  const measureType = measureTypeFromPipedrive(textValue(getPath(source, fields.maatregel)));
  const squareMeters = Number(textValue(getPath(source, fields.oppervlakte))) || createBlankMeasure(measureType).squareMeters;
  const subsidyStatus = subsidyStatusFromPipedrive(textValue(getPath(source, fields.subsidieOptie)));
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
    status: "Nieuw vanuit Pipedrive",
    advisor,
    customer: {
      salutation: "familie",
      name: textValue(getPath(source, fields.klantNaam)) || textValue(getPath(source, "organization.name")) || textValue(getPath(source, "deal.title")) || "Onbekende klant",
      address: addressFields.address,
      postalCode: addressFields.postalCode,
      city: addressFields.city,
      email: textValue(getPath(source, fields.email)),
      phone: textValue(getPath(source, fields.telefoon)),
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
  const bundle = await fetchPipedriveDealBundle(dealId);
  const { deal, person, organization } = bundle;
  const fields = getPipedriveFieldMap();
  const source = { deal, person, organization };
  const addressFields = await resolveCustomerAddressFromBundle(bundle);

  return {
    salutation: "familie",
    name: textValue(getPath(source, fields.klantNaam)) || textValue(getPath(source, "organization.name")) || textValue(deal.title) || "Onbekende klant",
    address: addressFields.address,
    postalCode: addressFields.postalCode,
    city: addressFields.city,
    email: textValue(getPath(source, fields.email)),
    phone: textValue(getPath(source, fields.telefoon)),
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
