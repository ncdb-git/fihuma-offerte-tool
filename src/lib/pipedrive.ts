import { Customer, Proposal } from "@/lib/types";

const baseUrl = process.env.PIPEDRIVE_COMPANY_DOMAIN
  ? `https://${process.env.PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1`
  : "https://api.pipedrive.com/v1";

function token() {
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    throw new Error("PIPEDRIVE_API_TOKEN is not configured");
  }
  return process.env.PIPEDRIVE_API_TOKEN;
}

export async function fetchPipedriveCustomer(dealId: string): Promise<Customer> {
  const response = await fetch(`${baseUrl}/deals/${dealId}?api_token=${token()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Pipedrive deal ophalen mislukt: ${response.status}`);
  }

  const payload = await response.json();
  const deal = payload.data;
  const person = deal.person_id ?? {};
  const organization = deal.org_id ?? {};

  return {
    salutation: "familie",
    name: person.name ?? organization.name ?? deal.title ?? "Onbekende klant",
    address: organization.address ?? "",
    postalCode: organization.address_postal_code ?? "",
    city: organization.address_locality ?? "",
    email: Array.isArray(person.email) ? person.email[0]?.value ?? "" : "",
    phone: Array.isArray(person.phone) ? person.phone[0]?.value ?? "" : "",
    pipedriveDealId: dealId,
    pipedriveDealLink: `https://${process.env.PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/deal/${dealId}`
  };
}

export async function uploadProposalPdf(proposal: Proposal, pdf: Blob) {
  const form = new FormData();
  form.append("file", pdf, `${proposal.id}-offerte.pdf`);
  form.append("deal_id", proposal.customer.pipedriveDealId);

  const response = await fetch(`${baseUrl}/files?api_token=${token()}`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    throw new Error(`Pipedrive PDF upload mislukt: ${response.status}`);
  }

  return response.json();
}
