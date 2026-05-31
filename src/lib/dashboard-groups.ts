import { buildDashboardConceptSnapshot, type DashboardConceptSnapshot } from "@/lib/proposal-configurator-progress";
import { advisorFirstName, proposalDisplayNumber } from "@/lib/proposal-numbering";
import { proposalDisplayTitle } from "@/lib/proposal-engine";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { isPipedriveDealId } from "@/lib/proposal-store-ids";
import type { Proposal } from "@/lib/types";

export type DashboardProposalRow = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
  title: string;
  status: string;
  displayNumber: string;
  measureLabel: string;
  advisorLabel: string;
  concept: DashboardConceptSnapshot;
};

export type DashboardCustomerGroup = {
  groupKey: string;
  pipedriveDealId: string | null;
  isPipedrive: boolean;
  customerName: string;
  addressLine: string;
  city: string;
  advisorFirstName: string;
  conceptCount: number;
  lastUpdatedAt: string;
  statusSummary: string;
  proposals: DashboardProposalRow[];
};

export type ProposalRecordInput = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

function measureLabel(proposal: Proposal) {
  const measure = proposal.measures[0];
  if (!measure) return "Maatregel nog te kiezen";
  return proposalDisplayTitle(proposal);
}

export function dashboardGroupKey(proposal: Proposal) {
  const dealId = proposal.customer.pipedriveDealId?.trim() ?? "";
  if (isPipedriveDealId(dealId)) return `deal:${dealId}`;

  const name = proposal.customer.name.trim().toLowerCase();
  const address = proposal.customer.address.trim().toLowerCase();
  const postal = proposal.customer.postalCode.trim().toLowerCase();
  if (name || address || postal) {
    return `manual:${name}|${address}|${postal}`;
  }

  return `manual:single:${proposal.id}`;
}

function customerLabel(proposals: DashboardProposalRow[]) {
  const primary = proposals[0]?.proposal;
  if (!primary) return { name: "Onbekende klant", address: "—", city: "—" };

  const name = primary.customer.name.trim();
  if (name) {
    return {
      name,
      address: primary.customer.address.trim() || "—",
      city: primary.customer.city.trim() || "—"
    };
  }

  if (isPipedriveDealId(primary.customer.pipedriveDealId)) {
    return {
      name: `Pipedrive deal ${primary.customer.pipedriveDealId}`,
      address: primary.customer.address.trim() || "—",
      city: primary.customer.city.trim() || "—"
    };
  }

  return { name: "Handmatige offerte", address: primary.customer.address.trim() || "—", city: primary.customer.city.trim() || "—" };
}

function statusSummary(proposals: DashboardProposalRow[]) {
  const unique = [...new Set(proposals.map((p) => p.status))];
  if (unique.length <= 2) return unique.join(" · ");
  return `${unique.slice(0, 2).join(" · ")} +${unique.length - 2}`;
}

function pickAdvisorFirstName(proposals: DashboardProposalRow[]) {
  const withAdvisor = proposals.find((p) => p.proposal.advisor?.name?.trim());
  return advisorFirstName(withAdvisor?.proposal.advisor?.name);
}

export function groupDashboardProposals(records: ProposalRecordInput[]): DashboardCustomerGroup[] {
  const rows: DashboardProposalRow[] = records.map((record) => ({
    ...record,
    title: proposalDisplayTitle(record.proposal),
    status: normalizeProposalStatus(record.proposal.status),
    displayNumber: proposalDisplayNumber(record.proposal),
    measureLabel: measureLabel(record.proposal),
    advisorLabel: advisorFirstName(record.proposal.advisor?.name),
    concept: buildDashboardConceptSnapshot(record.proposal)
  }));

  const map = new Map<string, DashboardProposalRow[]>();
  for (const row of rows) {
    const key = dashboardGroupKey(row.proposal);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: DashboardCustomerGroup[] = [];

  for (const [groupKey, proposals] of map.entries()) {
    proposals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const lastUpdatedAt = proposals.reduce((max, p) => (p.updatedAt > max ? p.updatedAt : max), proposals[0]?.updatedAt ?? "");
    const primary = proposals[0]?.proposal;
    const dealId = primary?.customer.pipedriveDealId?.trim() ?? "";
    const pipedriveDealId = isPipedriveDealId(dealId) ? dealId : null;
    const customer = customerLabel(proposals);

    groups.push({
      groupKey,
      pipedriveDealId,
      isPipedrive: Boolean(pipedriveDealId),
      customerName: customer.name,
      addressLine: customer.address,
      city: customer.city,
      advisorFirstName: pickAdvisorFirstName(proposals),
      conceptCount: proposals.length,
      lastUpdatedAt,
      statusSummary: statusSummary(proposals),
      proposals
    });
  }

  groups.sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
  return groups;
}

export function isManualGroup(group: DashboardCustomerGroup) {
  return !group.isPipedrive;
}
