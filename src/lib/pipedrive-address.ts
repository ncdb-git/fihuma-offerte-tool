import { Customer } from "@/lib/types";

type PipedriveRecord = Record<string, unknown>;

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) return textValue((value as { value: unknown }).value);
  return "";
}

function firstNonEmpty(...values: string[]) {
  return values.map((v) => v.trim()).find(Boolean) ?? "";
}

function customFieldValue(record: PipedriveRecord, envKey: string) {
  const fieldKey = process.env[envKey]?.trim();
  if (!fieldKey) return "";
  return textValue(record[fieldKey]);
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

export type ResolvedCustomerAddress = Pick<Customer, "address" | "postalCode" | "city"> & {
  sources: {
    address: string;
    postalCode: string;
    city: string;
  };
};

/** Haalt adres, postcode en woonplaats op uit deal custom fields, persoon en organisatie. */
export function resolveCustomerAddressFromBundle(bundle: {
  deal: PipedriveRecord;
  person: PipedriveRecord;
  organization: PipedriveRecord;
}): ResolvedCustomerAddress {
  const { deal, person, organization } = bundle;

  const dealAdres = customFieldValue(deal, "PIPEDRIVE_FIELD_ADRES");
  const personAdres = customFieldValue(person, "PIPEDRIVE_FIELD_ADRES");
  const dealPostcode = customFieldValue(deal, "PIPEDRIVE_FIELD_POSTCODE");
  const personPostcodeCustom = customFieldValue(person, "PIPEDRIVE_FIELD_POSTCODE");
  const dealPlaats = customFieldValue(deal, "PIPEDRIVE_FIELD_WOONPLAATS");
  const personPlaatsCustom = customFieldValue(person, "PIPEDRIVE_FIELD_WOONPLAATS");

  const personStreet = streetFromRecord(person, "postal_address");
  const personPostcode = textValue(person.postal_address_postal_code);
  const personCity = textValue(person.postal_address_locality);

  const orgStreet = streetFromRecord(organization, "address");
  const orgPostcode = textValue(organization.address_postal_code);
  const orgCity = textValue(organization.address_locality);

  const address = firstNonEmpty(dealAdres, personAdres, personStreet, orgStreet);
  const postalCode = firstNonEmpty(dealPostcode, personPostcodeCustom, personPostcode, orgPostcode);
  const city = firstNonEmpty(dealPlaats, personPlaatsCustom, personCity, orgCity);

  const sources = {
    address: dealAdres
      ? "deal_custom_adres"
      : personAdres
        ? "person_custom_adres"
        : personStreet
          ? "person_postal_address"
          : orgStreet
            ? "organization_address"
            : "none",
    postalCode: dealPostcode
      ? "deal_custom_postcode"
      : personPostcodeCustom
        ? "person_custom_postcode"
        : personPostcode
          ? "person_postal_code"
          : orgPostcode
            ? "organization_postal_code"
            : "none",
    city: dealPlaats
      ? "deal_custom_woonplaats"
      : personPlaatsCustom
        ? "person_custom_woonplaats"
        : personCity
          ? "person_locality"
          : orgCity
            ? "organization_locality"
            : "none"
  };

  return { address, postalCode, city, sources };
}
