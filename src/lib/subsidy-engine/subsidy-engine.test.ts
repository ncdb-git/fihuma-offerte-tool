import { describe, expect, it } from "vitest";
import { defaultDakCombination } from "@/lib/dak-combination";
import { finalizeProposalForStore } from "@/lib/proposal-engine";
import {
  applyFinancialsToProposal,
  calculateCombinedFinancials,
  calculateProposalFinancials,
  createCalculationSnapshot,
  extractNipEuro,
  getEffectiveNetInvestment
} from "@/lib/subsidy-engine";
import type { Measure, Proposal } from "@/lib/types";

function baseProposal(measures: Measure[], extra: Partial<Proposal> = {}): Proposal {
  return {
    id: "FIH-TEST-01",
    status: "In bewerking",
    label: "Fihuma Collectief",
    title: "Testofferte",
    subtitle: "Test",
    createdAt: "2026-01-01T00:00:00.000Z",
    advisor: { id: "a", name: "Test", phone: "", email: "t@t.nl", active: true },
    customer: {
      salutation: "familie",
      name: "Test",
      address: "Straat 1",
      postalCode: "1234 AB",
      city: "Teststad",
      email: "t@t.nl",
      phone: "06",
      pipedriveDealId: "19673",
      pipedriveDealLink: ""
    },
    situation: {
      inspection: "",
      homeInfo: "",
      summary: "",
      buildingType: "",
      buildYear: "",
      isolationTargets: "",
      inspectionDate: "2026-01-01T00:00:00.000Z"
    },
    introText: "",
    workflowIntro: "",
    whyFihuma: [],
    clauses: [],
    notes: "",
    agreement: {
      paymentTerms: "",
      subsidyClause: "",
      nextSteps: "",
      termsReference: "",
      approvalMethod: "digital"
    },
    measures,
    ...extra
  };
}

function measure(partial: Partial<Measure> & Pick<Measure, "id" | "type">): Measure {
  return {
    title: partial.type,
    productName: "Testproduct",
    application: "",
    squareMeters: 0,
    description: "",
    rcValue: "",
    warranty: "",
    lifespan: "",
    benefits: [],
    specifications: [],
    workDescription: "",
    extraWork: [],
    adjustments: [],
    subsidies: [],
    grossInvestment: 0,
    netInvestment: 0,
    subsidyStatus: "single",
    ...partial
  };
}

describe("Subsidy Engine v1", () => {
  it("berekent enkel ISDE voor één maatregel", () => {
    const spouw = measure({
      id: "m1",
      type: "spouwmuur",
      squareMeters: 68,
      grossInvestment: 2450
    });
    const result = calculateProposalFinancials(baseProposal([spouw]));

    expect(result.measures[0]?.isde.amount).toBe(357);
    expect(result.measures[0]?.isde.rate).toBe(5.25);
    expect(result.totals.netInvestment).toBe(2450 - 357);
  });

  it("past dubbel ISDE toe bij twee geselecteerde offertes", () => {
    const spouw = measure({ id: "m1", type: "spouwmuur", squareMeters: 68, grossInvestment: 2450 });
    const vloer = measure({ id: "m2", type: "vloer", squareMeters: 52, grossInvestment: 2750 });

    const primary = baseProposal([spouw], { id: "FIH-A" });
    const sibling = baseProposal([vloer], { id: "FIH-B" });

    const combined = calculateCombinedFinancials(primary, [primary, sibling]);
    expect(combined.primary.measures[0]?.isde.rate).toBe(10.5);
    expect(combined.primary.measures[0]?.isde.amount).toBe(714);
    expect(combined.perProposal[0]?.measures[0]?.isde.rate).toBe(11);
  });

  it("combineert spouw en bodem met verhoogd tarief", () => {
    const spouw = measure({ id: "m1", type: "spouwmuur", squareMeters: 68, grossInvestment: 2450 });
    const bodem = measure({ id: "m2", type: "bodem", squareMeters: 48, grossInvestment: 1325 });

    const primary = baseProposal([spouw], { id: "FIH-S" });
    const sibling = baseProposal([bodem], { id: "FIH-B" });
    const result = calculateProposalFinancials(primary, {
      combinationProposalIds: [sibling.id],
      siblingProposals: [sibling]
    });

    expect(result.combinedMeasureCount).toBe(2);
    expect(result.measures[0]?.isde.rate).toBe(10.5);
    expect(result.measures[0]?.isde.amount).toBe(714);
  });

  it("telt onafgewerkt dakdeel mee voor ISDE", () => {
    const dak = measure({
      id: "m-dak",
      type: "dak",
      squareMeters: 40,
      grossInvestment: 5000,
      dakCombination: {
        ...defaultDakCombination(),
        unfinishedProduct: "roof35",
        unfinishedSquareMeters: 15,
        unfinishedQuoteAmount: 570
      },
      extraWork: [{ id: "dak-unfinished-combo", description: "ROOF35", amount: 570 }]
    });

    const result = calculateProposalFinancials(baseProposal([dak]));
    expect(result.measures[0]?.isde.squareMeters).toBe(55);
    expect(result.measures[0]?.isde.amount).toBe(893.75);
  });

  it("behoudt NIP na server-finalize (webhook/save scenario)", () => {
    const withNip = measure({
      id: "m1",
      type: "spouwmuur",
      squareMeters: 68,
      grossInvestment: 2450,
      subsidies: [{ id: "cfg-nip", description: "NIP", amount: -500 }]
    });

    const proposal = baseProposal([withNip]);
    const finalized = finalizeProposalForStore(proposal);

    expect(extractNipEuro(finalized.measures[0]!)).toBe(500);
    expect(finalized.measures[0]?.subsidies.some((line) => line.id === "cfg-nip")).toBe(true);
  });

  it("waarschuwt bij netto nul", () => {
    const m = measure({
      id: "m1",
      type: "spouwmuur",
      squareMeters: 68,
      grossInvestment: 357,
      subsidies: []
    });
    const result = calculateProposalFinancials(baseProposal([m]));
    expect(result.totals.netInvestment).toBe(0);
    expect(result.warnings.some((warning) => warning.code === "NET_INVESTMENT_ZERO")).toBe(true);
  });

  it("waarschuwt bij netto negatief", () => {
    const m = measure({
      id: "m1",
      type: "spouwmuur",
      squareMeters: 68,
      grossInvestment: 1000,
      subsidies: [
        { id: "cfg-isde", description: "ISDE", amount: -357 },
        { id: "cfg-nip", description: "NIP", amount: -800 }
      ]
    });
    const result = calculateProposalFinancials(baseProposal([m]));
    expect(result.totals.netInvestment).toBe(-157);
    expect(result.warnings.some((warning) => warning.code === "NET_INVESTMENT_NEGATIVE")).toBe(true);
  });

  it("gebruikt snapshot voor dashboard en PDF netto", () => {
    const m = measure({ id: "m1", type: "spouwmuur", squareMeters: 68, grossInvestment: 2450, netInvestment: 9999 });
    const proposal = baseProposal([m]);
    const snapshot = createCalculationSnapshot(proposal, "pdf_generate");
    const withSnapshot = {
      ...applyFinancialsToProposal(proposal),
      calculationSnapshot: snapshot
    };

    expect(getEffectiveNetInvestment(withSnapshot)).toBe(snapshot.result.totals.netInvestment);
    expect(getEffectiveNetInvestment(withSnapshot)).toBe(2093);
  });

  it("behoudt handmatige subsidyStatus double-previous zonder sibling-combinatie", () => {
    const m = measure({
      id: "m1",
      type: "spouwmuur",
      squareMeters: 68,
      grossInvestment: 2450,
      subsidyStatus: "double-previous"
    });
    const result = calculateProposalFinancials(baseProposal([m]));
    expect(result.measures[0]?.isde.rate).toBe(10.5);
    expect(result.measures[0]?.isde.status).toBe("double-previous");
  });
});
