import { pipedriveBaseUrl, pipedriveToken } from "@/lib/pipedrive-config";

type PipedriveFieldDef = {
  key?: string;
  name?: string;
  field_type?: string;
};

let dealFieldsCache: PipedriveFieldDef[] | null = null;
let personFieldsCache: PipedriveFieldDef[] | null = null;

async function fetchFieldDefs(path: "/dealFields" | "/personFields") {
  const response = await fetch(`${pipedriveBaseUrl}${path}?api_token=${pipedriveToken()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Pipedrive ${path} mislukt: ${response.status}`);
  const payload = await response.json();
  return (payload.data ?? []) as PipedriveFieldDef[];
}

function matchField(fields: PipedriveFieldDef[], patterns: RegExp[]) {
  const hit = fields.find((field) => {
    const name = String(field.name ?? "").toLowerCase();
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

/** Vindt custom field API keys op label (adres/postcode/plaats) + env override. */
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

    const dealAdres =
      matchField(dealFieldsCache, [/straat/, /huisnummer/, /\badres\b/, /address/]) ??
      matchField(personFieldsCache, [/straat/, /huisnummer/, /\badres\b/, /address/]);
    const dealPostcode =
      matchField(dealFieldsCache, [/postcode/, /postal/]) ?? matchField(personFieldsCache, [/postcode/, /postal/]);
    const dealPlaats =
      matchField(dealFieldsCache, [/woonplaats/, /\bplaats\b/, /stad/, /city/, /locality/]) ??
      matchField(personFieldsCache, [/woonplaats/, /\bplaats\b/, /stad/, /city/, /locality/]);

    if (!envAdres && dealAdres) sources.adres = "discovered";
    if (!envPostcode && dealPostcode) sources.postcode = "discovered";
    if (!envPlaats && dealPlaats) sources.woonplaats = "discovered";

    return {
      adres: envAdres ?? dealAdres,
      postcode: envPostcode ?? dealPostcode,
      woonplaats: envPlaats ?? dealPlaats,
      sources
    };
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
      .filter((f) => /adres|straat|postcode|plaats|woon|address|postal|city/i.test(String(f.name ?? "")))
      .map((f) => ({ key: f.key, name: f.name, field_type: f.field_type }));

  return {
    dealFields: filter(dealFieldsCache),
    personFields: filter(personFieldsCache)
  };
}
