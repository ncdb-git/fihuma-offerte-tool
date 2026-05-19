import { pipedriveBaseUrl, pipedriveToken } from "@/lib/pipedrive-config";

type PipedriveFieldDef = {
  key?: string;
  name?: string;
  field_type?: string;
};

let dealFieldsCache: PipedriveFieldDef[] | null = null;
let personFieldsCache: PipedriveFieldDef[] | null = null;

const STANDARD_FIELD_KEYS = new Set([
  "id",
  "title",
  "stage_id",
  "pipeline_id",
  "person_id",
  "org_id",
  "user_id",
  "creator_user_id",
  "value",
  "currency",
  "status",
  "probability"
]);

async function fetchFieldDefs(path: "/dealFields" | "/personFields") {
  const response = await fetch(`${pipedriveBaseUrl}${path}?api_token=${pipedriveToken()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Pipedrive ${path} mislukt: ${response.status}`);
  const payload = await response.json();
  return (payload.data ?? []) as PipedriveFieldDef[];
}

function isCustomFieldKey(key: string | undefined) {
  if (!key) return false;
  if (STANDARD_FIELD_KEYS.has(key)) return false;
  return /^[a-f0-9]{40}$/i.test(key);
}

function matchCustomField(fields: PipedriveFieldDef[], patterns: RegExp[]) {
  const hit = fields.find((field) => {
    if (!isCustomFieldKey(field.key)) return false;
    const name = String(field.name ?? "").trim().toLowerCase();
    return patterns.some((pattern) => pattern.test(name));
  });
  return hit?.key?.trim() ?? null;
}

export type DiscoveredFieldKeys = {
  adres: string | null;
  postcode: string | null;
  woonplaats: string | null;
  sources: Record<string, string>;
};

/** Vindt custom field API keys — adresvelden staan bij Fihuma op Persoon. */
export async function discoverAddressFieldKeys(): Promise<DiscoveredFieldKeys> {
  const sources: Record<string, string> = {};

  const envAdres = process.env.PIPEDRIVE_FIELD_ADRES?.trim();
  const envPostcode = process.env.PIPEDRIVE_FIELD_POSTCODE?.trim();
  const envPlaats = process.env.PIPEDRIVE_FIELD_WOONPLAATS?.trim();

  if (envAdres) sources.adres = "env";
  if (envPostcode) sources.postcode = "env";
  if (envPlaats) sources.woonplaats = "env";

  try {
    if (!dealFieldsCache) dealFieldsCache = await fetchFieldDefs("/dealFields");
    if (!personFieldsCache) personFieldsCache = await fetchFieldDefs("/personFields");

    // Fihuma: straat/postcode/plaats zijn persoon-velden (zie personFields in debug)
    const personAdres = matchCustomField(personFieldsCache, [/straat/, /huisnummer/, /\badres\b/, /address/]);
    const personPostcode = matchCustomField(personFieldsCache, [/^postcode$/, /postal/]);
    const personPlaats = matchCustomField(personFieldsCache, [/^plaats$/, /^woonplaats$/, /^stad$/, /^city$/]);

    const dealAdres = matchCustomField(dealFieldsCache, [/straat/, /huisnummer/, /\badres\b/, /address/]);
    const dealPostcode = matchCustomField(dealFieldsCache, [/^postcode$/, /postal/]);
    const dealPlaats = matchCustomField(dealFieldsCache, [/^plaats$/, /^woonplaats$/, /^stad$/, /^city$/]);

    const adres = envAdres ?? personAdres ?? dealAdres;
    const postcode = envPostcode ?? personPostcode ?? dealPostcode;
    const woonplaats = envPlaats ?? personPlaats ?? dealPlaats;

    if (!envAdres && personAdres) sources.adres = "discovered_person";
    else if (!envAdres && dealAdres) sources.adres = "discovered_deal";
    if (!envPostcode && personPostcode) sources.postcode = "discovered_person";
    else if (!envPostcode && dealPostcode) sources.postcode = "discovered_deal";
    if (!envPlaats && personPlaats) sources.woonplaats = "discovered_person";
    else if (!envPlaats && dealPlaats) sources.woonplaats = "discovered_deal";

    return { adres, postcode, woonplaats, sources };
  } catch (error) {
    console.warn("[pipedrive] field discovery mislukt, alleen env keys", error);
    return {
      adres: envAdres ?? null,
      postcode: envPostcode ?? null,
      woonplaats: envPlaats ?? null,
      sources
    };
  }
}

export async function listAddressRelatedFields() {
  if (!dealFieldsCache) dealFieldsCache = await fetchFieldDefs("/dealFields");
  if (!personFieldsCache) personFieldsCache = await fetchFieldDefs("/personFields");

  const filter = (fields: PipedriveFieldDef[]) =>
    fields
      .filter((f) => isCustomFieldKey(f.key) && /adres|straat|postcode|plaats|woon|address|postal|city/i.test(String(f.name ?? "")))
      .map((f) => ({ key: f.key, name: f.name, field_type: f.field_type }));

  return {
    dealFields: filter(dealFieldsCache),
    personFields: filter(personFieldsCache)
  };
}
