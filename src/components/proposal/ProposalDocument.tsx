import {
  calculateIsdeSubsidy,
  formatCustomerSalutation,
  formatLetterGreeting,
  measureAdjustmentsTotal,
  measureBrutoTotal,
  measureExtraWorkTotal,
  money,
  OFFER_VALID_DAYS,
  PAYMENT_TERM_OPTIONS,
  PRIOR_APPROVAL_NOTICE
} from "@/lib/proposal-engine";
import { Measure, Proposal } from "@/lib/types";
import { Fragment } from "react";

function nlDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function nlDateMedium(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function offerValidUntilLabel(iso: string, validDays = OFFER_VALID_DAYS) {
  const d = new Date(iso);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + validDays);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

const WHY_FIHUMA_CARDS = [
  {
    title: "Persoonlijke service",
    body: "Wij begeleiden het gehele traject, van advies en planning tot uitvoering en nazorg. U heeft duidelijke aanspreekpunten en weet waar u aan toe bent."
  },
  {
    title: "Sterke prijs-kwaliteitverhouding",
    body: "Onze teams zijn gespecialiseerd in isolatiewerkzaamheden en werken volgens vaste werkwijzen. Zo combineren wij nette uitvoering met een eerlijke prijs."
  },
  {
    title: "15 jaar garantie",
    body:
      "Bij Fihuma Isolatie staan we achter de kwaliteit van onze materialen en uitvoering. Daarom bieden wij standaard 15 jaar garantie op onze isolatieoplossingen. Zo bent u verzekerd van langdurige bescherming en een blijvend comfortabeler huis."
  },
  {
    title: "Goede beoordelingen",
    body: "Dagelijks helpen wij woningeigenaren aan meer comfort en een lagere energierekening. Dat wordt gewaardeerd door onze klanten."
  }
] as const;

/** Logo in /public/brand — URL-encoded vanwege spatie in bestandsnaam. */
const FIHUMA_LOGO_SRC = "/brand/Logo%20Fihuma.png";
const DEFAULT_MEASURE_HERO_SRC = "/brand/Images/PIF_HEADER.png";

type MeasureHeroContent = {
  imageSrc?: string;
  title: string;
  subtitle: string;
};

const MEASURE_HERO_CONTENT: Record<Measure["type"], MeasureHeroContent> = {
  spouwmuur: {
    imageSrc: "/brand/Images/SPOUWMUUR.jpg",
    title: "Knauf Supafil",
    subtitle: "Comfortabele gevelisolatie met een nette afwerking"
  },
  vloer: {
    imageSrc: "/brand/Images/Verwerkingsfoto%20PIF%20vloerisolatie%203.jpg",
    title: "PIF FLOOR 35",
    subtitle: "Vloerisolatie vanuit de kruipruimte"
  },
  bodem: {
    imageSrc: "/brand/Images/Bodemisolatie_Maatregel.png",
    title: "EPS-PARELS",
    subtitle: "Een drogere kruipruimte en meer rust onder de woning"
  },
  dak: {
    imageSrc: "/brand/Images/PIF%20ROOF.jpg",
    title: "PIF Roof",
    subtitle: "Dakisolatie met focus op comfort en kwaliteit"
  }
};

const PRODUCT_HERO_CONTENT: Partial<Record<Measure["type"], Record<string, MeasureHeroContent>>> = {
  dak: {
    "pif isofast35": {
      imageSrc: "/brand/Images/PIF%20ISOFAST.jpg",
      title: "PIF ISOFAST 35",
      subtitle: "Strakke dakisolatie met hoogwaardige afwerking"
    }
  }
};

const PRODUCT_MELDCODES: Record<string, string> = {
  "knauf supafil cavity wall": "KA21823",
  "eps-parels spouwvulling": "KA18431",
  "pif floor35": "KA28513",
  "pif floor40": "KA28513",
  "eps-parels bodemisolatie": "KA18775",
  "pif roof35": "KA28514",
  "pif roof40": "KA28514",
  "pif isofast35": "KA28516",
  gramitherm: "KA26689"
};

function meldcodeForMeasure(measure: Measure) {
  return PRODUCT_MELDCODES[measure.productName.trim().toLowerCase()] ?? "Nog aan te vullen";
}

function FihumaLogo({ variant = "page" }: { variant?: "page" | "cover" }) {
  return (
    <img
      src={FIHUMA_LOGO_SRC}
      alt="Fihuma"
      className={variant === "cover" ? "fihuma-logo fihuma-logo--cover" : "fihuma-logo page-logo"}
      decoding="async"
    />
  );
}

function coverHeroForMeasure(measure?: Measure) {
  if (!measure) return null;
  if (measure.type === "vloer") return DEFAULT_MEASURE_HERO_SRC;
  if (measure.type === "bodem") return "/brand/Images/BODEM.png";
  return null;
}

function coverSubtitleForMeasure(measure?: Measure) {
  if (!measure) return "Comfortabeler wonen met minder warmteverlies";
  const subtitles: Record<Measure["type"], string> = {
    spouwmuur: "Meer comfort door een beter geïsoleerde gevel",
    vloer: "Comfortabeler wonen met minder warmteverlies",
    bodem: "Een drogere kruipruimte en meer rust onder de woning",
    dak: "Duurzaam comfort onder een beter geïsoleerd dak"
  };
  return subtitles[measure.type];
}

function ProposalPageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={className ? `proposal-page ${className}` : "proposal-page"}>
      <FihumaLogo />
      {children}
    </section>
  );
}

function CoverHero({ src }: { src?: string | null }) {
  if (src && src.trim() !== "") {
    return (
      <div className="cover-hero cover-hero--photo">
        <img className="cover-hero__img" src={src} alt="" decoding="async" />
      </div>
    );
  }

  return (
    <div className="cover-hero cover-hero--abstract" aria-hidden="true">
      <div className="cover-hero__abstract" />
    </div>
  );
}

function MeasureHero({ measure }: { measure: Measure }) {
  const productKey = measure.productName.trim().toLowerCase();
  const hero = PRODUCT_HERO_CONTENT[measure.type]?.[productKey] ?? MEASURE_HERO_CONTENT[measure.type];
  const imageSrc = hero.imageSrc ?? DEFAULT_MEASURE_HERO_SRC;

  return (
    <figure className={`measure-hero measure-hero--${measure.type}`}>
      <img className="measure-hero__img" src={imageSrc} alt="" decoding="async" />
      <figcaption className="measure-hero__copy">
        <span>{hero.title || measure.productName}</span>
        <strong>{hero.subtitle}</strong>
      </figcaption>
    </figure>
  );
}

function CoverPage({ proposal }: { proposal: Proposal }) {
  const measure = proposal.measures[0];
  const quoteNr = proposal.quoteNumber?.trim() || proposal.id;
  const coverTitle = measure?.title ? `Offerte ${measure.title}` : "Offerte";
  const coverHeroSrc = proposal.coverSfeerImageSrc || coverHeroForMeasure(measure);
  const coverSubtitle = coverSubtitleForMeasure(measure);

  return (
    <section className="proposal-page cover-page">
      <div className="cover-sheet">
        <header className="cover-header">
          <p className="cover-header__kicker">
            <span>Fihuma Isolatie</span>
            <span className="cover-header__sep" aria-hidden="true">
              {" "}
              //{" "}
            </span>
            <span>Sinds 1994 uw betrouwbare partner in isolatieoplossingen.</span>
          </p>
          <FihumaLogo variant="cover" />
        </header>

        <CoverHero src={coverHeroSrc} />

        <div className="cover-titleBlock">
          <h1 className="cover-titleBlock__title">{coverTitle}</h1>
          <p className="cover-titleBlock__subtitle">{coverSubtitle}</p>
        </div>

        <div className="cover-cardGrid">
          <div className="cover-cardGrid__row cover-cardGrid__row--duo">
            <article className="cover-personCard">
              <h2 className="cover-personCard__label">
                <span>Opgesteld</span>
                <span>voor</span>
              </h2>
              <p className="cover-personCard__name">{formatCustomerSalutation(proposal.customer)}</p>
              <p className="cover-personCard__lines">
                {proposal.customer.address}
                <br />
                {proposal.customer.postalCode} {proposal.customer.city}
              </p>
              <p className="cover-personCard__lines">
                <a href={`mailto:${proposal.customer.email}`}>{proposal.customer.email}</a>
                <br />
                {proposal.customer.phone}
              </p>
            </article>
            <article className="cover-personCard">
              <h2 className="cover-personCard__label">
                <span>Gemaakt</span>
                <span>door</span>
              </h2>
              <p className="cover-personCard__name">{proposal.advisor.name}</p>
              <p className="cover-personCard__lines">{proposal.label}</p>
              <p className="cover-personCard__lines">
                <a href={`mailto:${proposal.advisor.email}`}>{proposal.advisor.email}</a>
                <br />
                {proposal.advisor.phone}
              </p>
            </article>
          </div>
          <div className="cover-cardGrid__row cover-cardGrid__row--triple">
            <div className="cover-infoCard cover-infoCard--accent">
              <span>Offertenummer</span>
              <strong>{quoteNr}</strong>
            </div>
            <div className="cover-infoCard cover-infoCard--accent">
              <span>Offertedatum</span>
              <strong>{nlDateMedium(proposal.createdAt)}</strong>
            </div>
            <div className="cover-infoCard cover-infoCard--accent">
              <span>Geldig tot</span>
              <strong>{offerValidUntilLabel(proposal.createdAt)}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewPage({ proposal }: { proposal: Proposal }) {
  const customer = proposal.customer;
  const addr = `${customer.address}, ${customer.postalCode} ${customer.city}`;
  return (
    <ProposalPageShell className="overview-page">
      <p className="eyebrow">Uw voorstel</p>
      <h2>Van inspectie naar helder isolatieadvies</h2>

      <div className="overview-flow">
        <div className="overview-flow__intro">
          <p className="prose-lead">Beste {formatLetterGreeting(customer)},</p>
          <p>
            Naar aanleiding van uw interesse in het verduurzamen van uw woning ontvangt u hierbij onze op maat gemaakte offerte. Op basis van de opname hebben wij gekeken naar de huidige situatie, bereikbaarheid, ventilatie en mogelijkheden om uw woning comfortabeler en energiezuiniger te maken.
          </p>
          <p>{proposal.situation.summary}</p>
          <article className="home-summary-card">
            <h3 className="home-summary-card__title">Uw woning in het kort</h3>
            <dl className="spec-dl">
              <div className="spec-dl__row">
                <dt>Adres</dt>
                <dd>{addr}</dd>
              </div>
              <div className="spec-dl__row">
                <dt>Te isoleren onderdelen</dt>
                <dd>{proposal.situation.isolationTargets}</dd>
              </div>
              <div className="spec-dl__row">
                <dt>Inspectie door</dt>
                <dd>{proposal.advisor.name}</dd>
              </div>
            </dl>
          </article>
        </div>

      </div>
    </ProposalPageShell>
  );
}

function WhyFihumaPage() {
  return (
    <ProposalPageShell>
      <p className="eyebrow">Waarom Fihuma Isolatie</p>
      <h2>Vertrouwen door duidelijkheid en vakmanschap</h2>
      <p className="lead lead--wide">
        Fihuma combineert collectieve scherpte met persoonlijke begeleiding. U kiest voor een partij die isolatie als kernvak ziet — van eerste scan tot oplevering.
      </p>
      <div className="trust-grid">
        {WHY_FIHUMA_CARDS.map((card) => (
          <article className="trust-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </ProposalPageShell>
  );
}

function cleanSubsidyDescription(description: string) {
  return description.replace(/\s+indicatie\b/i, "").replace(/\s*\([^)]*\)\s*$/, "");
}

function InvestmentTable({ measure, paymentTerms }: { measure: Measure; paymentTerms: string }) {
  const brutoTotal = measureBrutoTotal(measure);
  const adjustmentsTotal = measureAdjustmentsTotal(measure);
  const payableToFihuma = brutoTotal + adjustmentsTotal;
  const showDepositSchedule = paymentTerms === PAYMENT_TERM_OPTIONS[0].text;

  return (
    <div className="investment-wrap investment-wrap--stacked">
      <section className="investment-card investment-card--breakdown">
        <p className="investment-card__title">Prijsopbouw</p>

        <div className="investment-mini-list">
          <div>
            <span>
              {measure.squareMeters} m² {measure.productName} {measure.title.toLowerCase()}
            </span>
            <strong>{money(measure.grossInvestment)}</strong>
          </div>
          {measure.extraWork.map((row) => (
            <div key={row.id}>
              <span>{row.description}</span>
              <strong>{money(row.amount)}</strong>
            </div>
          ))}
          {(measure.adjustments ?? []).map((row) => (
            <div key={row.id}>
              <span>{row.description || "Korting / toeslag"}</span>
              <strong>{money(row.amount)}</strong>
            </div>
          ))}
        </div>

        <div className="investment-total">
          <span>U betaalt aan Fihuma Isolatie</span>
          <strong>{money(payableToFihuma)}</strong>
        </div>

        {showDepositSchedule ? (
          <div className="payment-schedule">
            <div>
              <span>25% bij akkoord</span>
              <strong>{money(payableToFihuma * 0.25)}</strong>
            </div>
            <div>
              <span>75% achteraf na oplevering</span>
              <strong>{money(payableToFihuma * 0.75)}</strong>
            </div>
          </div>
        ) : null}
      </section>

      <section className="investment-card investment-card--subsidy">
        <p className="investment-card__title">Subsidie en netto investering</p>

        <div className="investment-table investment-table--summary">
          <div className="investment-table__row">
            <span className="investment-table__desc">Bruto investering</span>
            <strong className="investment-table__amt">{money(payableToFihuma)}</strong>
          </div>
          {measure.subsidies.map((row) => (
            <div className="investment-table__row investment-table__row--credit" key={row.id}>
              <span className="investment-table__desc">{cleanSubsidyDescription(row.description)}</span>
              <strong className="investment-table__amt">− {money(Math.abs(row.amount))}</strong>
            </div>
          ))}
        </div>

        <div className="investment-net investment-net--total investment-net--brand">
          <span className="investment-net__label">Uw netto investering na ontvangst subsidie bedraagt</span>
          <strong className="investment-net__value">{money(measure.netInvestment)}</strong>
        </div>
      </section>
    </div>
  );
}

function MeasureBlock({ measure }: { measure: Measure }) {
  return (
    <section className="measure-block">
      <header className="measure-block__header">
        <p className="eyebrow">Uw gekozen maatregel</p>
        <h2>{measure.title}</h2>
      </header>

      <MeasureHero measure={measure} />

      <article className="product-inline-card">
        <p className="product-inline-card__name">{measure.productName}</p>
        <p className="measure-block__lead">
          {measure.description} De gekozen oplossing is ontwikkeld voor langdurige prestaties: {measure.lifespan.toLowerCase()}
        </p>
        <dl className="spec-dl spec-dl--compact">
          <div className="spec-dl__row">
            <dt>Toepassing</dt>
            <dd>{measure.application}</dd>
          </div>
          <div className="spec-dl__row">
            <dt>Oppervlakte</dt>
            <dd>{measure.squareMeters} m²</dd>
          </div>
          <div className="spec-dl__row">
            <dt>Isolatiewaarde</dt>
            <dd>{measure.rcValue}</dd>
          </div>
          <div className="spec-dl__row">
            <dt>Garantie</dt>
            <dd>{measure.warranty}</dd>
          </div>
        </dl>
      </article>

      <div className="measure-content-grid">
        <article className="text-panel text-panel--measure">
          <h3>Voordelen</h3>
          <ul className="benefit-list">
            {measure.benefits.slice(0, 5).map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>

        <article className="text-panel text-panel--measure">
          <h3>Werkzaamheden</h3>
          <p>{measure.workDescription}</p>
        </article>
      </div>
    </section>
  );
}

function InvestmentPage({ proposal, measure }: { proposal: Proposal; measure: Measure }) {
  return (
    <ProposalPageShell className="investment-page">
      <p className="eyebrow">Investering</p>
      <h2>Heldere investering voor {measure.title.toLowerCase()}</h2>
      <p className="lead lead--wide">
        Hieronder ziet u de prijsopbouw, het bedrag dat u aan ons betaalt en uw netto investering na verrekening van subsidies.
      </p>
      <InvestmentTable measure={measure} paymentTerms={proposal.agreement.paymentTerms} />
    </ProposalPageShell>
  );
}

function AgreementPage({ proposal }: { proposal: Proposal }) {
  const validUntil = offerValidUntilLabel(proposal.createdAt);
  const priorForm = proposal.agreement.approvalMethod === "prior-form";
  const measure = proposal.measures[0];
  const isde = measure ? calculateIsdeSubsidy(measure) : null;

  return (
    <ProposalPageShell className="agreement-page">
      <p className="eyebrow">Akkoord en vervolgstappen</p>
      <h2>Vervolg en afspraken</h2>

      <section className="agreement-card-group">
        <h3>Planning en afspraken</h3>
        <div className="agreement-card-grid agreement-card-grid--planning">
          <article className="text-panel">
            <h3>Planning</h3>
            <p>{proposal.notes || "Planning gaat in goed overleg met u. Uitvoering is vaak een dagdeel per maatregel."}</p>
          </article>
          <article className="text-panel">
            <h3>Betalingscondities</h3>
            <p>{proposal.agreement.paymentTerms}</p>
          </article>
          <article className="text-panel">
            <h3>Geldigheidsduur</h3>
            <p>
              Deze offerte is geldig tot <strong>{validUntil}</strong> ({OFFER_VALID_DAYS} dagen na de offertedatum), tenzij anders vermeld.
            </p>
          </article>
        </div>
      </section>

      <section className="agreement-card-group">
        <h3>Subsidie en ondersteuning</h3>
        <div className="agreement-card-grid agreement-card-grid--four">
          <article className="text-panel agreement-full">
            <h3>Meldcode</h3>
            {proposal.measures.map((m) => (
              <p key={m.id}>
                Voor {m.productName} ({m.title.toLowerCase()}) is de meldcode m.b.t. de ISDE subsidie{" "}
                <strong>{meldcodeForMeasure(m)}</strong>.
              </p>
            ))}
          </article>
          <article className="text-panel agreement-full">
            <h3>ISDE subsidie</h3>
            {measure && isde ? (
              <p>
                {isde.isTooSmall
                  ? `Voor deze maatregel geldt een minimale subsidiabele oppervlakte van ${isde.min} m². Daarom is er geen ISDE-subsidie opgenomen.`
                  : `${isde.explanation} Het berekende ISDE-bedrag is ${money(isde.amount)} op basis van ${isde.eligibleSquareMeters} subsidiabele m²${
                      isde.isCapped ? `, met een maximum van ${isde.max} m².` : "."
                    }`}
              </p>
            ) : (
              <p>Geen ISDE-subsidie opgenomen.</p>
            )}
          </article>
          <article className="text-panel agreement-full">
            <h3>Subsidievoorwaarden</h3>
            <p>{proposal.agreement.subsidyClause}</p>
          </article>
          <article className="text-panel agreement-full">
            <h3>Subsidiesupport</h3>
            <p>Wij bieden kosteloos begeleiding bij het aanvragen van de NIP-subsidie bij de gemeente.</p>
          </article>
        </div>
      </section>

      <article className="text-panel agreement-full agreement-nextsteps">
        <h3>Vervolgstappen</h3>
        <p>Na uw akkoord stemmen wij de planning met u af en ontvangt u een opdrachtbevestiging met de definitieve afspraken. Eventuele subsidieaanvragen begeleiden wij uiteraard in overleg met u.</p>
      </article>

      <section className="agreement-contract-section">
        <p className="agreement-contract-eyebrow">Bedankt voor uw vertrouwen</p>
        <h2 className="agreement-section-title">Overeenkomst</h2>
        <div className="agreement-closing">
          <p>Wij hopen dat het voorstel goed aansluit bij uw woning en wensen, en helpen u graag richting een comfortabelere en energiezuinigere woning.</p>
          <p>Beide partijen verklaren zich akkoord met de inhoud van de offerte en de algemene voorwaarden.</p>
        </div>

        <div className="advisor-agreement-card">
          <span>Namens Fihuma Isolatie BV</span>
          <strong>{proposal.advisor.name}</strong>
        </div>

        {priorForm ? (
          <article className="text-panel agreement-full">
            <p>{PRIOR_APPROVAL_NOTICE}</p>
            {proposal.agreement.priorApprovalDate ? (
              <p>
                <strong>Akkoorddatum:</strong> {nlDateLong(proposal.agreement.priorApprovalDate)}
              </p>
            ) : null}
          </article>
        ) : (
          <div className="signature-block">
            <p className="signature-block__intro">Akkoord voor uitvoering conform deze offerte:</p>
            <div className="signature-grid">
              <div>
                <span>{formatCustomerSalutation(proposal.customer)}</span>
              </div>
              <div>
                <span>Handtekening en datum</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="agreement-legal-small">
        Op alle offertes, aanbiedingen en overeenkomsten met Fihuma Isolatie BV. zijn haar algemene voorwaarden van toepassing. Deze voorwaarden worden steeds bij toezending
        van de offerte/aanbieding verstrekt en staan vermeld op onze website www.fihuma.nl. Tevens zijn deze voorwaarden gedeponeerd bij de Kamer van Koophandel te Rotterdam
        onder nummer: 65652711.
      </p>
    </ProposalPageShell>
  );
}

export function ProposalDocument({ proposal }: { proposal: Proposal }) {
  return (
    <main className="proposal-document">
      <CoverPage proposal={proposal} />
      <OverviewPage proposal={proposal} />
      <WhyFihumaPage />
      {proposal.measures.map((measure) => (
        <Fragment key={measure.id}>
          <ProposalPageShell>
            <MeasureBlock measure={measure} />
          </ProposalPageShell>
          <InvestmentPage proposal={proposal} measure={measure} />
        </Fragment>
      ))}
      <AgreementPage proposal={proposal} />
    </main>
  );
}
