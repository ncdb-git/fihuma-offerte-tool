export const pipedriveBaseUrl = process.env.PIPEDRIVE_COMPANY_DOMAIN
  ? `https://${process.env.PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1`
  : "https://api.pipedrive.com/v1";

export function pipedriveToken() {
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    throw new Error("PIPEDRIVE_API_TOKEN is not configured");
  }
  return process.env.PIPEDRIVE_API_TOKEN;
}
