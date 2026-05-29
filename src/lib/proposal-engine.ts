import { Advisor, Customer, IsdeSubsidyStatus, Measure, MoneyLine, Proposal } from "@/lib/types";

export const OFFER_VALID_DAYS = 14;

export const PRIOR_APPROVAL_NOTICE =
  "De opdrachtgever heeft reeds akkoord gegeven via het ondertekende advies- en calculatieformulier. Dit document dient uitsluitend als bevestiging en verdere uitwerking van de gemaakte afspraken.";

export const advisors: Advisor[] = [
  {
    id: "jeffrey",
    name: "Jeffrey de Groot",
    phone: "06 51 15 71 23",
    email: "jeffrey@fihumacollectief.nl",
    active: true
  },
  {
    id: "nick",
    name: "Nick de Bruijn",
    phone: "06 39 70 91 29",
    email: "nick@fihumacollectief.nl",
    active: true
  },
  {
    id: "doron",
    name: "Doron Zohar",
    phone: "06 40 66 68 04",
    email: "doron@fihumacollectief.nl",
    active: true
  },
  {
    id: "jesse",
    name: "Jesse Wilhelm",
    phone: "06 36 58 67 90",
    email: "jesse@fihumacollectief.nl",
    active: true
  },
  {
    id: "job",
    name: "Job in 't Veld",
    phone: "06 26 07 33 37",
    email: "job@fihumacollectief.nl",
    active: true
  },
  {
    id: "dick",
    name: "Dick de Groot",
    phone: "06 20 13 35 10",
    email: "dick@fihumacollectief.nl",
    active: true
  },
  {
    id: "dylan",
    name: "Dylan Batenburg",
    phone: "06 53 21 80 02",
    email: "dylan@fihumacollectief.nl",
    active: true
  },
  {
    id: "admin-demo",
    name: "Demo adviseur",
    phone: "085 060 12 00",
    email: "advies@fihumacollectief.nl",
    active: false
  }
];

export const measurePresets: Record<Measure["type"], Omit<Measure, "id">> = {
  spouwmuur: {
    type: "spouwmuur",
    title: "Spouwmuurisolatie",
    productName: "Knauf Supafil Cavity Wall",
    application: "Na-isolatie van de bestaande spouw in metselwerk, geschikt voor woningen met een lege spouw.",
    squareMeters: 68,
    description:
      "Met spouwmuurisolatie dicht u de belangrijkste koudebrug aan de gevels. Het materiaal vult de spouw volledig en blijft dampopen, zodat vocht uit de constructie kan ontsnappen.",
    rcValue: "Rd 1,70 m²K/W",
    warranty: "15 jaar garantie",
    lifespan: "Levensduur gelijk aan de woning; materiaal niet verouderend in de spouw.",
    benefits: [
      "Optimale isolatie van de gevel",
      "Flexibel en goed toepasbaar op bestaand metselwerk",
      "Vochtwerend en dampopen",
      "Duurzaam en gezond woonklimaat",
      "Hoge isolatiewaarde per euro geïnvesteerd",
      "Lange levensduur zonder onderhoud"
    ],
    specifications: ["Dampopen", "Onbrandbaar Euroklasse A1", "Waterafstotend", "KIWA verwerkingsrichtlijn"],
    workDescription:
      "Wij boren volgens patroon in de voeg, vullen de spouw gecontroleerd en herstellen de boorgaten met passend voegwerk.",
    extraWork: [{ id: "ew-1", description: "Renovatiekoker plaatsen", amount: 145 }],
    subsidies: [{ id: "sub-1", description: "ISDE subsidie", amount: -530 }],
    grossInvestment: 2450,
    netInvestment: 1920
  },
  vloer: {
    type: "vloer",
    title: "Vloerisolatie",
    productName: "PIF FLOOR35",
    application: "Isolatie van de bodem van de begane grond vanuit de kruipruimte, geschikt voor droge tot licht vochtige kruipruimtes.",
    squareMeters: 52,
    description:
      "Een goed geïsoleerde vloer voorkomt koude voeten en verlaagt de energievraag. De reflecterende laag sluit naadloos aan op de constructie en wordt netjes afgewerkt rond doorvoeren.",
    rcValue: "Rd 3,5 m²K/W",
    warranty: "15 jaar garantie",
    lifespan: "Meer dan 25 jaar functionele levensduur bij juiste toepassing.",
    benefits: [
      "Optimale isolatie onder de woonlaag",
      "Flexibel en goed toepasbaar in kruipruimtes",
      "Vochtbestendig materiaal",
      "Duurzaam en licht van gewicht",
      "Hoge isolatiewaarde",
      "Lange levensduur"
    ],
    specifications: ["Hoge isolatiewaarde", "Vochtbestendig", "Lichtgewicht", "Geschikt voor kruipruimtes"],
    workDescription:
      "De isolatielaag wordt strak onder de vloer aangebracht. Doorvoeren worden zorgvuldig afgewerkt en indien nodig wordt de bodem afgedicht met folie.",
    extraWork: [
      { id: "ew-2", description: "Bodemfolie", amount: 250 },
      { id: "ew-3", description: "Ventilatiekoker", amount: 60 }
    ],
    subsidies: [
      { id: "sub-2", description: "Gemeentelijke subsidie", amount: -800 },
      { id: "sub-3", description: "ISDE subsidie", amount: -495 }
    ],
    grossInvestment: 2750,
    netInvestment: 1455
  },
  bodem: {
    type: "bodem",
    title: "Bodemisolatie",
    productName: "EPS-parels bodemisolatie",
    application: "Bodemafsluiting van de kruipruimte met isolerende EPS-parels.",
    squareMeters: 48,
    description: "Bodemisolatie met EPS-parels helpt kou en vocht vanuit de kruipruimte te beperken en verhoogt het wooncomfort.",
    rcValue: "Rc 4,04",
    warranty: "15 jaar garantie",
    lifespan: "25 jaar en langer functioneel.",
    benefits: ["Vochtwerend", "Lichtgewicht EPS-parels", "Snelle verwerking", "Onderhoudsarm", "Comfortverbetering", "Lange levensduur"],
    specifications: ["EPS-parels", "Vochtwerend", "Lichtgewicht", "Onderhoudsarm"],
    workDescription:
      "De EPS-parels worden egaal over de bodem van de kruipruimte verdeeld, zodat kou en vocht vanuit de bodem worden afgeremd.",
    extraWork: [],
    subsidies: [],
    grossInvestment: 1325,
    netInvestment: 1325
  },
  dak: {
    type: "dak",
    title: "Dakisolatie",
    productName: "PIR renovatieplaat",
    application: "Isolatie van het schuin of vlak dakvlak aan de binnenzijde.",
    squareMeters: 41,
    description: "Dakisolatie aan de binnenzijde met hoge isolatiewaarde per centimeter.",
    rcValue: "Rd 4,0 m²K/W",
    warranty: "15 jaar garantie",
    lifespan: "30+ jaar bij juiste verwerking.",
    benefits: ["Hoge isolatiewaarde", "Strakke afwerking", "Dampremmende laag", "Duurzaam comfort", "Lange levensduur"],
    specifications: ["Hoge Rd-waarde", "Strakke afwerking", "Dampremmende laag", "Geschikt voor schuine daken"],
    workDescription:
      "Het dakvlak wordt voorbereid, dampremmend afgewerkt en voorzien van isolatieplaten volgens inspectieadvies.",
    extraWork: [{ id: "ew-4", description: "Afwerking naden en kieren", amount: 180 }],
    subsidies: [{ id: "sub-4", description: "ISDE subsidie", amount: -615 }],
    grossInvestment: 3890,
    netInvestment: 3275
  }
};

export function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function exportProductName(productName: string) {
  const key = productName.trim().toLowerCase();
  if (key.includes("supafil")) return "Knauf Supafil";
  return productName.trim();
}

function customerLastName(name: string) {
  const words = name
    .replace(/^(familie|dhr\.?|mevr\.?|de heer|mevrouw)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "klant";

  const prefixes = new Set(["de", "den", "der", "het", "'t", "ten", "ter", "van", "v/d", "vd"]);
  const last = words[words.length - 1];
  const previous = words[words.length - 2]?.toLowerCase();
  return previous && prefixes.has(previous) ? `${words[words.length - 2]} ${last}` : last;
}

export function formatProposalPdfFilename(proposal: Proposal) {
  const measure = proposal.measures[0];
  const measureLabel = measure ? `${exportProductName(measure.productName)} ${measure.title}` : "Offerte";
  const filename = `Fihuma Collectief Offerte ${measureLabel} __ ${customerLastName(proposal.customer.name)}.pdf`;
  return filename.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

export const PAYMENT_TERM_OPTIONS = [
  {
    id: "deposit-25",
    label: "25% aanbetaling / 75% achteraf",
    text: "25% aanbetaling na akkoord en 75% achteraf via pinbetaling na uitvoering."
  },
  {
    id: "pin-after",
    label: "100% achteraf",
    text: "100% achteraf via pinbetaling na uitvoering."
  }
] as const;

export const ISDE_SUBSIDY_STATUS_OPTIONS: { id: IsdeSubsidyStatus; label: string; description: string }[] = [
  {
    id: "single",
    label: "Enkele subsidie",
    description: "Klant laat slechts een verduurzamingsmaatregel uitvoeren."
  },
  {
    id: "double-fihuma",
    label: "Dubbele subsidie - meerdere maatregelen via Fihuma",
    description: "Klant ontvangt twee of meer offertes / maatregelen via Fihuma."
  },
  {
    id: "double-previous",
    label: "Dubbele subsidie - combinatie met eerdere maatregel",
    description: "Klant combineert deze maatregel met een eerder uitgevoerde verduurzamingsmaatregel buiten Fihuma."
  }
] as const;

export const subsidyRules: Record<Measure["type"], { single: number; double: number; min: number; max: number }> = {
  spouwmuur: { single: 5.25, double: 10.5, min: 10, max: 170 },
  vloer: { single: 5.5, double: 11, min: 20, max: 130 },
  bodem: { single: 3, double: 6, min: 20, max: 130 },
  dak: { single: 16.25, double: 32.5, min: 20, max: 200 }
};

export function isdeSubsidyExplanation(status: IsdeSubsidyStatus) {
  if (status === "double-fihuma") {
    return "Voor deze maatregel is rekening gehouden met de verhoogde ISDE-subsidie voor meerdere verduurzamingsmaatregelen binnen dezelfde woning.";
  }
  if (status === "double-previous") {
    return "Voor deze maatregel is rekening gehouden met de verhoogde ISDE-subsidie doordat deze gecombineerd wordt met een eerder uitgevoerde verduurzamingsmaatregel.";
  }
  return "Voor deze maatregel is een ISDE-subsidie van toepassing op basis van een uitgevoerde verduurzamingsmaatregel.";
}

export function calculateIsdeSubsidy(measure: Pick<Measure, "type" | "squareMeters" | "subsidyStatus">) {
  const status = measure.subsidyStatus ?? "single";
  const rule = subsidyRules[measure.type];
  const squareMeters = Math.max(0, Number(measure.squareMeters) || 0);
  const eligibleSquareMeters = squareMeters < rule.min ? 0 : Math.min(squareMeters, rule.max);
  const rate = status === "single" ? rule.single : rule.double;
  const amount = Math.round(eligibleSquareMeters * rate * 100) / 100;
  return {
    amount,
    eligibleSquareMeters,
    explanation: isdeSubsidyExplanation(status),
    isCapped: squareMeters > rule.max,
    isTooSmall: squareMeters > 0 && squareMeters < rule.min,
    max: rule.max,
    min: rule.min,
    rate,
    status
  };
}

export const SUBSIDY_CLAUSE_OPTIONS = [
  {
    id: "guarantee",
    label: "Subsidiegarantie",
    text:
      "Met onze subsidiegarantie maken we het u zo makkelijk mogelijk: u levert uw gegevens eenmalig aan, wij starten direct met isoleren en de gemeente hoeft uw aanvraag maar een keer te beoordelen. Mocht uw correcte en tijdige NIP-aanvraag toch worden afgewezen, dan nemen wij het subsidiebedrag voor onze rekening. De subsidiegarantie geldt uitsluitend indien de werkzaamheden zijn uitgevoerd. Indien vóór uitvoering blijkt dat subsidiebudgetten zijn uitgeput of de regeling wordt beëindigd, kunnen de werkzaamheden geen doorgang vinden en vervalt de subsidiegarantie."
  },
  {
    id: "reservation",
    label: "Subsidie reserveren",
    text: "Wij kunnen de werkzaamheden plannen als de subsidie gereserveerd en bevestigd is door de gemeente."
  }
] as const;

export function measureExtraWorkTotal(measure: Measure) {
  return measure.extraWork.reduce((sum, line) => sum + line.amount, 0);
}

export function measureAdjustmentsTotal(measure: Measure) {
  return (measure.adjustments ?? []).reduce((sum, line) => sum + line.amount, 0);
}

export function measureBrutoTotal(measure: Measure) {
  return measure.grossInvestment + measureExtraWorkTotal(measure);
}

export function calculateNetInvestment(measure: Measure) {
  const subsidies = measure.subsidies.reduce((sum, line) => sum + line.amount, 0);
  return measureBrutoTotal(measure) + subsidies + measureAdjustmentsTotal(measure);
}

export function applyAutomaticIsdeSubsidy(measure: Measure, nipEuro = 0): Measure {
  const isde = calculateIsdeSubsidy(measure);
  const next = {
    ...measure,
    subsidies: configuratorSubsidies(isde.amount, nipEuro, `ISDE subsidie (${isde.eligibleSquareMeters} m² × ${money(isde.rate)})`)
  };
  return { ...next, netInvestment: calculateNetInvestment(next) };
}

export function normalizeMeasure(measure: Measure): Measure {
  return {
    ...measure,
    adjustments: measure.adjustments ?? [],
    extraWork: measure.extraWork ?? [],
    subsidies: measure.subsidies ?? []
  };
}

export function createMeasure(type: Measure["type"]): Measure {
  const base: Measure = {
    id: `${type}-${Date.now()}`,
    ...measurePresets[type],
    adjustments: [],
    subsidyStatus: measurePresets[type].subsidyStatus ?? "single"
  };
  return applyAutomaticIsdeSubsidy(base);
}

/** Lege maatregel voor de guided builder: geen demo-meerwerk, wel automatische ISDE-berekening. */
export function createBlankMeasure(type: Measure["type"]): Measure {
  const base = measurePresets[type];
  const cleared: Measure = {
    ...base,
    id: `${type}-${Date.now()}`,
    squareMeters: 0,
    grossInvestment: 0,
    extraWork: [],
    adjustments: [],
    subsidies: [],
    subsidyStatus: base.subsidyStatus ?? "single",
    netInvestment: 0
  };
  return applyAutomaticIsdeSubsidy(cleared);
}

export type ProductChoice = { key: string; label: string };

export const MAIN_PRODUCTS: Record<Measure["type"], ProductChoice[]> = {
  spouwmuur: [
    { key: "supafil", label: "Supafil" },
    { key: "eps", label: "EPS-parels" }
  ],
  vloer: [
    { key: "pif35", label: "PIF Floor35" },
    { key: "pif40", label: "PIF Floor40" }
  ],
  bodem: [{ key: "eps", label: "EPS-parels" }],
  dak: [
    { key: "roof35", label: "PIF Roof35" },
    { key: "roof40", label: "PIF Roof40" },
    { key: "isofast35", label: "PIF Isofast35" },
    { key: "gramitherm", label: "Gramitherm" }
  ]
};

const PRODUCT_PATCH: Partial<Record<Measure["type"], Record<string, Partial<Measure>>>> = {
  spouwmuur: {
    supafil: { productName: "Knauf Supafil Cavity Wall", rcValue: "Rd 1,70 m²K/W", warranty: "15 jaar garantie" },
    eps: { productName: "EPS-parels spouwvulling", rcValue: "Rd 1,55 m²K/W", warranty: "15 jaar garantie" }
  },
  vloer: {
    pif35: { productName: "PIF FLOOR35", rcValue: "Rd 3,5 m²K/W", warranty: "15 jaar garantie" },
    pif40: { productName: "PIF FLOOR40", rcValue: "Rd 4,0 m²K/W", warranty: "15 jaar garantie" }
  },
  bodem: {
    eps: { productName: "EPS-parels bodemisolatie", rcValue: "Rc 4,04", warranty: "15 jaar garantie" }
  },
  dak: {
    roof35: { productName: "PIF Roof35", rcValue: "Rd 3,5 m²K/W", warranty: "15 jaar garantie" },
    roof40: { productName: "PIF Roof40", rcValue: "Rd 4,0 m²K/W", warranty: "15 jaar garantie" },
    isofast35: { productName: "PIF Isofast35", rcValue: "Rd 3,5 m²K/W", warranty: "15 jaar garantie" },
    gramitherm: { productName: "Gramitherm", rcValue: "Rd 3,9 m²K/W", warranty: "15 jaar garantie" }
  }
};

export function applyProductToMeasure(measure: Measure, productKey: string): Measure {
  const patch = PRODUCT_PATCH[measure.type]?.[productKey];
  if (!patch) return measure;
  return { ...measure, ...patch, netInvestment: calculateNetInvestment({ ...measure, ...patch } as Measure) };
}

/** Standaard meerwerkprijzen (per stuk of vaste prijs). */
const MOD = {
  spouw_natuur: 495,
  spouw_hoog: 600,
  spouw_koker: 65,
  vloer_folie: 250,
  vloer_stof: 95,
  vloer_koker: 65,
  vloer_mangat: 250,
  bodem_koker: 65,
  bodem_mangat: 250,
  bodem_hak: 250,
  dak_gips: 420
} as const;

export type BuilderModules = {
  natuur: boolean;
  natuurPrijs: number;
  hoogwerker: boolean;
  hoogwerkerPrijs: number;
  ventKokers: number;
  ventKokerPrijs: number;
  bodemfolie: boolean;
  bodemfoliePrijs: number;
  stofvlies: boolean;
  stofvliesPrijs: number;
  mangat: number;
  mangatPrijs: number;
  puinRuimen: boolean;
  puinPrijs: number;
  hakken: boolean;
  hakkenPrijs: number;
  gips: boolean;
  gipsPrijs: number;
};

export const MODULE_DEFAULT_PRICES = MOD;

export function defaultModules(_type: Measure["type"]): BuilderModules {
  return {
    natuur: false,
    natuurPrijs: MOD.spouw_natuur,
    hoogwerker: false,
    hoogwerkerPrijs: MOD.spouw_hoog,
    ventKokers: 0,
    ventKokerPrijs: MOD.spouw_koker,
    bodemfolie: false,
    bodemfoliePrijs: MOD.vloer_folie,
    stofvlies: false,
    stofvliesPrijs: MOD.vloer_stof,
    mangat: 0,
    mangatPrijs: MOD.vloer_mangat,
    puinRuimen: false,
    puinPrijs: 175,
    hakken: false,
    hakkenPrijs: MOD.bodem_hak,
    gips: false,
    gipsPrijs: MOD.dak_gips
  };
}

export function buildModuleExtraWork(type: Measure["type"], m: BuilderModules, measureId: string): MoneyLine[] {
  const lines: MoneyLine[] = [];
  if (type === "spouwmuur") {
    if (m.natuur) lines.push({ id: `${measureId}-mod-natuur`, description: "Natuurvriendelijk isoleren", amount: m.natuurPrijs });
    if (m.hoogwerker) lines.push({ id: `${measureId}-mod-hoog`, description: "Hoogwerker", amount: m.hoogwerkerPrijs });
    if (m.ventKokers > 0) {
      const unit = m.ventKokerPrijs || MOD.spouw_koker;
      lines.push({
        id: `${measureId}-mod-koker`,
        description: `Ventilatiekokers (${m.ventKokers}× à ${money(unit)})`,
        amount: m.ventKokers * unit
      });
    }
  }
  if (type === "vloer") {
    if (m.bodemfolie) lines.push({ id: `${measureId}-mod-folie`, description: "Bodemfolie", amount: m.bodemfoliePrijs });
    if (m.stofvlies) lines.push({ id: `${measureId}-mod-stof`, description: "Stofvlies", amount: m.stofvliesPrijs });
    if (m.ventKokers > 0) {
      const unit = m.ventKokerPrijs || MOD.spouw_koker;
      lines.push({
        id: `${measureId}-mod-koker`,
        description: `Ventilatiekokers (${m.ventKokers}× à ${money(unit)})`,
        amount: m.ventKokers * unit
      });
    }
    if (m.mangat > 0) {
      const unit = m.mangatPrijs || MOD.vloer_mangat;
      lines.push({
        id: `${measureId}-mod-mangat`,
        description: `Mangat (${m.mangat}× à ${money(unit)})`,
        amount: m.mangat * unit
      });
    }
    if (m.puinRuimen && m.puinPrijs > 0) {
      lines.push({ id: `${measureId}-mod-puin`, description: "Puin ruimen", amount: m.puinPrijs });
    }
  }
  if (type === "bodem") {
    if (m.ventKokers > 0) {
      const unit = m.ventKokerPrijs || MOD.spouw_koker;
      lines.push({
        id: `${measureId}-mod-koker`,
        description: `Ventilatiekokers (${m.ventKokers}× à ${money(unit)})`,
        amount: m.ventKokers * unit
      });
    }
    if (m.mangat > 0) {
      const unit = m.mangatPrijs || MOD.vloer_mangat;
      lines.push({
        id: `${measureId}-mod-mangat`,
        description: `Mangat (${m.mangat}× à ${money(unit)})`,
        amount: m.mangat * unit
      });
    }
    if (m.hakken) {
      lines.push({
        id: `${measureId}-mod-hak`,
        description: "Hakken / opmetseling",
        amount: m.hakkenPrijs || MOD.bodem_hak
      });
    }
  }
  if (type === "dak" && m.gips) {
    lines.push({ id: `${measureId}-mod-gips`, description: "Gipsafwerking", amount: m.gipsPrijs });
  }
  return lines;
}

export const MEASURE_TYPE_LABELS: Record<Measure["type"], string> = {
  spouwmuur: "Spouwmuurisolatie",
  vloer: "Vloerisolatie",
  bodem: "Bodemisolatie",
  dak: "Dakisolatie"
};

export function formatCustomerSalutation(customer: Customer): string {
  const name = customer.name.trim();
  if (customer.salutation === "familie") return name.startsWith("Familie") ? name : `Familie ${name}`;
  if (customer.salutation === "dhr.") return `Dhr. ${name}`;
  if (customer.salutation === "mevr.") return `Mevr. ${name}`;
  return `Dhr. en mevr. ${name}`;
}

export function formatLetterGreeting(customer: Customer): string {
  const name = customer.name.trim();
  if (customer.salutation === "familie") return name.startsWith("Familie") ? name : `familie ${name}`;
  if (customer.salutation === "dhr.") return `heer ${name}`;
  if (customer.salutation === "mevr.") return `mevrouw ${name}`;
  return `${name}`;
}

export function configuratorSubsidies(isdeEuro: number, nipEuro: number, isdeDescription = "ISDE subsidie"): MoneyLine[] {
  const lines: MoneyLine[] = [];
  if (isdeEuro > 0) lines.push({ id: "cfg-isde", description: isdeDescription, amount: -Math.abs(isdeEuro) });
  if (nipEuro > 0) lines.push({ id: "cfg-nip", description: "NIP / gemeentelijke subsidie", amount: -Math.abs(nipEuro) });
  return lines;
}

export function getProductKeyForMeasure(measure: Measure): string {
  for (const p of MAIN_PRODUCTS[measure.type]) {
    const ref = applyProductToMeasure(createBlankMeasure(measure.type), p.key);
    if (ref.productName === measure.productName) return p.key;
  }
  return MAIN_PRODUCTS[measure.type][0]?.key ?? "pif35";
}

export function proposalDisplayTitle(proposal: Pick<Proposal, "title" | "id" | "measures">) {
  const measure = proposal.measures[0];
  if (measure) {
    return `${MEASURE_TYPE_LABELS[measure.type]} offerte`;
  }
  return proposal.title || proposal.id;
}

export function isolationLabelForType(type: Measure["type"]): string {
  const labels: Record<Measure["type"], string> = {
    spouwmuur: "Spouwmuur",
    vloer: "Vloer (kruipruimte)",
    bodem: "Bodem / kruipruimte",
    dak: "Dak"
  };
  return labels[type];
}

export function createDemoProposal(dealId = "1234"): Proposal {
  return {
    id: `FIH-${dealId}`,
    status: "concept",
    label: "Fihuma Collectief",
    title: "Offerte isolatiemaatregelen",
    subtitle: "Sinds 1994 uw betrouwbare partner in isolatieoplossingen.",
    createdAt: new Date().toISOString(),
    coverSfeerImageSrc: null,
    quoteNumber: null,
    advisor: advisors[0],
    customer: {
      salutation: "familie",
      name: "Familie Jansen",
      address: "Lindelaan 24",
      postalCode: "3818 AB",
      city: "Amersfoort",
      email: "familie.jansen@example.nl",
      phone: "06 44 55 66 77",
      pipedriveDealId: dealId,
      pipedriveDealLink: `https://fihuma.pipedrive.com/deal/${dealId}`
    },
    situation: {
      inspection:
        "Tijdens de opname is gekeken naar bereikbaarheid, ventilatie, vochtbeeld en de bestaande isolatiewaarde. De spouw bleek geschikt voor na-isolatie en de kruipruimte was droog en toegankelijk.",
      homeInfo: "Tussenwoning uit 1978 met toegankelijke kruipruimte en na-isoleerbare spouw.",
      summary:
        "De combinatie van spouwmuur- en vloerisolatie levert naar verwachting de grootste comfortwinst op.",
      buildingType: "Tussenwoning",
      buildYear: "1978",
      isolationTargets: "Spouwmuur en vloer (kruipruimte)",
      inspectionDate: new Date().toISOString()
    },
    introText:
      "Op basis van de inspectie adviseren wij onderstaande maatregelen. De offerte is modulair opgebouwd: per maatregel ziet u het product, de werkzaamheden, de investering en de indicatieve subsidies.",
    workflowIntro:
      "Wij leveren en plaatsen isolatiemaatregelen die passen bij de technische situatie van uw woning. Het doel is om warmteverlies te beperken, het wooncomfort te verhogen en vochtproblemen te voorkomen.",
    whyFihuma: [
      "Ervaren isolatiespecialisten met duidelijke opname en uitvoering.",
      "Heldere subsidie-indicatie en transparante netto investering.",
      "Netjes werk, vaste aanspreekpunten en professionele oplevering.",
      "Oplossingen die technisch passen bij de woning, niet bij een standaardmal."
    ],
    clauses: [],
    notes: "Planning gaat in goed overleg met u. Uitvoering is vaak een dagdeel per maatregel.",
    agreement: {
      paymentTerms: PAYMENT_TERM_OPTIONS[1].text,
      subsidyClause: SUBSIDY_CLAUSE_OPTIONS[0].text,
      nextSteps:
        "Na uw akkoord stemmen wij de planning met u af en ontvangt u een opdrachtbevestiging met de definitieve afspraken. Eventuele subsidieaanvragen begeleiden wij uiteraard in overleg met u.",
      termsReference:
        "Op deze offerte en de uitvoering zijn onze algemene voorwaarden van toepassing. Deze sturen we altijd mee met de offerte.",
      approvalMethod: "digital",
      priorApprovalDate: null
    },
    measures: [createMeasure("spouwmuur"), createMeasure("vloer")]
  };
}

/** Eén maatregel, leeg preset — past bij MVP: één offerte = één maatregeltype. */
export function createGuidedProposal(dealId = "1234"): Proposal {
  const base = createDemoProposal(dealId);
  const first = MAIN_PRODUCTS.vloer[0].key;
  const m0 = applyProductToMeasure(createBlankMeasure("vloer"), first);
  return {
    ...base,
    measures: [m0],
    situation: {
      ...base.situation,
      isolationTargets: isolationLabelForType("vloer"),
      summary:
        "Naar aanleiding van de inspectie lichten wij de gekozen isolatiemaatregel en bijbehorende investering toe."
    }
  };
}

export const demoProposals: Proposal[] = [
  createDemoProposal("1248"),
  {
    ...createDemoProposal("1281"),
    id: "FIH-1281",
    status: "offerte gegenereerd",
    customer: {
      ...createDemoProposal("1281").customer,
      name: "De heer Meijer",
      address: "Stationsweg 12",
      city: "Ede"
    }
  },
  {
    ...createDemoProposal("1312"),
    id: "FIH-1312",
    status: "verstuurd",
    customer: {
      ...createDemoProposal("1312").customer,
      name: "Mevrouw Bakker",
      address: "Kerkstraat 7",
      city: "Zwolle"
    }
  }
];
