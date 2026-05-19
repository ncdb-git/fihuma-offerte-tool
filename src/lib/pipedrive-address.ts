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

function pickFromRecords(
  records: Array<{ label: string; data: PipedriveRecord }>,
  fieldKey: string | null | undefined,
  reader: (record: PipedriveRecord, key: string | null | undefined) => string
) {
  for (const { label, data } of records) {
    const value = reader(data, fieldKey);
    if (value) {
      return { value, source: `${label}_custom_field` };
    }
  }
  return { value: "", source: "none" };
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

  const records = [
    { label: "person", data: person },
    { label: "deal", data: deal },
    { label: "organization", data: organization }
  ];

  const fromPersonAdres = pickFromRecords(records, fieldKeys.adres, addressFromFieldKey);
  const fromPersonPostcode = pickFromRecords(records, fieldKeys.postcode, postcodeFromFieldKey);
  const fromPersonPlaats = pickFromRecords(records, fieldKeys.woonplaats, cityFromFieldKey);

  const scannedDeal = scanForAddressObjects(deal);
  const scannedPerson = scanForAddressObjects(person);

  const personStreet = streetFromRecord(person, "postal_address");
  const personPostcode = textValue(person.postal_address_postal_code);
  const personCity = textValue(person.postal_address_locality);

  const orgStreet = streetFromRecord(organization, "address");
  const orgPostcode = textValue(organization.address_postal_code);
  const orgCity = textValue(organization.address_locality);

  const address = firstNonEmpty(fromPersonAdres.value, scannedPerson[0]?.address ?? "", scannedDeal[0]?.address ?? "", personStreet, orgStreet);
  const postalCode = firstNonEmpty(
    fromPersonPostcode.value,
    scannedPerson[0]?.postalCode ?? "",
    scannedDeal[0]?.postalCode ?? "",
    personPostcode,
    orgPostcode
  );
  const city = firstNonEmpty(fromPersonPlaats.value, scannedPerson[0]?.city ?? "", scannedDeal[0]?.city ?? "", personCity, orgCity);

  const sources = {
    address: fromPersonAdres.source,
    postalCode: fromPersonPostcode.source,
    city: fromPersonPlaats.source
  };

  const dealFieldHits: Record<string, unknown> = {};
  const personFieldHits: Record<string, unknown> = {};
  for (const key of [fieldKeys.adres, fieldKeys.postcode, fieldKeys.woonplaats]) {
    if (!key) continue;
    dealFieldHits[key] = deal[key] ?? null;
    personFieldHits[key] = person[key] ?? null;
  }

  return {
    address,
    postalCode,
    city,
    sources,
    debug: { fieldKeys, dealFieldHits, personFieldHits }
  };
}
