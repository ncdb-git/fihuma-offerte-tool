import { Customer } from "@/lib/types";
import { discoverAddressFieldKeys, type DiscoveredFieldKeys } from "@/lib/pipedrive-field-discovery";

type PipedriveRecord = Record<string, unknown>;

const STANDARD_DEAL_KEYS = new Set([
  "id",
  "title",
  "creator_user_id",
  "user_id",
  "person_id",
  "org_id",
  "stage_id",
  "value",
  "currency",
  "add_time",
  "update_time",
  "stage_change_time",
  "active",
  "deleted",
  "status",
  "probability",
  "lost_reason",
  "visible_to",
  "close_time",
  "pipeline_id",
  "won_time",
  "lost_time",
  "label",
  "local_won_date",
  "local_lost_date",
  "local_close_date",
  "origin",
  "origin_id",
  "channel",
  "channel_id",
  "is_archived",
  "archive_time"
]);

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) return textValue((value as { value: unknown }).value);
  return "";
}

function firstNonEmpty(...values: string[]) {
  return values.map((v) => v.trim()).find(Boolean) ?? "";
}

/** Pipedrive address-type custom fields komen vaak als object binnen. */
function parseAddressObject(raw: unknown): Pick<Customer, "address" | "postalCode" | "city"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { address: textValue(raw), postalCode: "", city: "" };
  }

  const o = raw as Record<string, unknown>;
  const route = textValue(o.route);
  const number = textValue(o.street_number);
  const address = firstNonEmpty(
    [route, number].filter(Boolean).join(" "),
    textValue(o.value),
    textValue(o.formatted_address),
    textValue(o.address)
  );
  const postalCode = firstNonEmpty(textValue(o.postal_code), textValue(o.postal_code), textValue(o.zip));
  const city = firstNonEmpty(textValue(o.locality), textValue(o.admin_area_level_2), textValue(o.sublocality), textValue(o.city));

  return { address, postalCode, city };
}

function textFromFieldKey(record: PipedriveRecord, fieldKey: string | null | undefined) {
  if (!fieldKey) return "";
  return textValue(record[fieldKey]);
}

function addressFromFieldKey(record: PipedriveRecord, fieldKey: string | null | undefined) {
  if (!fieldKey) return "";
  const raw = record[fieldKey];
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "object") return parseAddressObject(raw).address;
  return textValue(raw);
}

function postcodeFromFieldKey(record: PipedriveRecord, fieldKey: string | null | undefined) {
  if (!fieldKey) return "";
  const raw = record[fieldKey];
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "object") return parseAddressObject(raw).postalCode;
  return textValue(raw);
}

function cityFromFieldKey(record: PipedriveRecord, fieldKey: string | null | undefined) {
  if (!fieldKey) return "";
  const raw = record[fieldKey];
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "object") return parseAddressObject(raw).city;
  return textValue(raw);
}

function streetFromRecord(record: PipedriveRecord, prefix: "postal_address" | "address") {
  const route = textValue(record[`${prefix}_route`]);
  const number = textValue(record[`${prefix}_street_number`]);
  const combined = [route, number].filter(Boolean).join(" ").trim();
  if (combined) return combined;

  const formatted = textValue(record[`${prefix}_formatted_address`]);
  if (formatted) return formatted;

  if (prefix === "postal_address") {
    return textValue(record.postal_address);
  }
  return textValue(record.address);
}

/** Scan deal/person object voor address-achtige custom field objecten. */
function scanForAddressObjects(record: PipedriveRecord) {
  const results: Array<Pick<Customer, "address" | "postalCode" | "city">> = [];

  for (const [key, value] of Object.entries(record)) {
    if (STANDARD_DEAL_KEYS.has(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const o = value as Record<string, unknown>;
    const looksLikeAddress =
      "locality" in o ||
      "postal_code" in o ||
      "postal_code" in o ||
      "formatted_address" in o ||
      ("route" in o && ("street_number" in o || "postal_code" in o));

    if (looksLikeAddress) {
      const parsed = parseAddressObject(o);
      if (parsed.address || parsed.postalCode || parsed.city) {
        results.push(parsed);
      }
    }
  }

  return results;
}

export type ResolvedCustomerAddress = Pick<Customer, "address" | "postalCode" | "city"> & {
  sources: {
    address: string;
    postalCode: string;
    city: string;
  };
  debug: {
    fieldKeys: DiscoveredFieldKeys;
    dealFieldHits: Record<string, unknown>;
    personFieldHits: Record<string, unknown>;
  };
};

export async function resolveCustomerAddressFromBundle(bundle: {
  deal: PipedriveRecord;
  person: PipedriveRecord;
  organization: PipedriveRecord;
}): Promise<ResolvedCustomerAddress> {
  const { deal, person, organization } = bundle;
  const fieldKeys = await discoverAddressFieldKeys();

  const fromDealAdres = addressFromFieldKey(deal, fieldKeys.adres);
  const fromPersonAdres = addressFromFieldKey(person, fieldKeys.adres);
  const fromDealPostcode = postcodeFromFieldKey(deal, fieldKeys.postcode);
  const fromPersonPostcode = postcodeFromFieldKey(person, fieldKeys.postcode);
  const fromDealPlaats = cityFromFieldKey(deal, fieldKeys.woonplaats);
  const fromPersonPlaats = cityFromFieldKey(person, fieldKeys.woonplaats);

  const scannedDeal = scanForAddressObjects(deal);
  const scannedPerson = scanForAddressObjects(person);

  const personStreet = streetFromRecord(person, "postal_address");
  const personPostcode = textValue(person.postal_address_postal_code);
  const personCity = textValue(person.postal_address_locality);

  const orgStreet = streetFromRecord(organization, "address");
  const orgPostcode = textValue(organization.address_postal_code);
  const orgCity = textValue(organization.address_locality);

  const address = firstNonEmpty(fromDealAdres, fromPersonAdres, scannedDeal[0]?.address ?? "", scannedPerson[0]?.address ?? "", personStreet, orgStreet);
  const postalCode = firstNonEmpty(
    fromDealPostcode,
    fromPersonPostcode,
    scannedDeal[0]?.postalCode ?? "",
    scannedPerson[0]?.postalCode ?? "",
    personPostcode,
    orgPostcode
  );
  const city = firstNonEmpty(fromDealPlaats, fromPersonPlaats, scannedDeal[0]?.city ?? "", scannedPerson[0]?.city ?? "", personCity, orgCity);

  const sources = {
    address: fromDealAdres
      ? "deal_custom_adres"
      : fromPersonAdres
        ? "person_custom_adres"
        : scannedDeal[0]?.address
          ? "deal_scan_address_object"
          : scannedPerson[0]?.address
            ? "person_scan_address_object"
            : personStreet
              ? "person_postal_address"
              : orgStreet
                ? "organization_address"
                : "none",
    postalCode: fromDealPostcode
      ? "deal_custom_postcode"
      : fromPersonPostcode
        ? "person_custom_postcode"
        : scannedDeal[0]?.postalCode
          ? "deal_scan_address_object"
          : personPostcode
            ? "person_postal_code"
            : orgPostcode
              ? "organization_postal_code"
              : "none",
    city: fromDealPlaats
      ? "deal_custom_woonplaats"
      : fromPersonPlaats
        ? "person_custom_woonplaats"
        : scannedDeal[0]?.city
          ? "deal_scan_address_object"
          : personCity
            ? "person_locality"
            : orgCity
              ? "organization_locality"
              : "none"
  };

  const dealFieldHits: Record<string, unknown> = {};
  const personFieldHits: Record<string, unknown> = {};
  if (fieldKeys.adres) {
    dealFieldHits[fieldKeys.adres] = deal[fieldKeys.adres];
    personFieldHits[fieldKeys.adres] = person[fieldKeys.adres];
  }
  if (fieldKeys.postcode) {
    dealFieldHits[fieldKeys.postcode] = deal[fieldKeys.postcode];
    personFieldHits[fieldKeys.postcode] = person[fieldKeys.postcode];
  }
  if (fieldKeys.woonplaats) {
    dealFieldHits[fieldKeys.woonplaats] = deal[fieldKeys.woonplaats];
    personFieldHits[fieldKeys.woonplaats] = person[fieldKeys.woonplaats];
  }

  return {
    address,
    postalCode,
    city,
    sources,
    debug: { fieldKeys, dealFieldHits, personFieldHits }
  };
}
