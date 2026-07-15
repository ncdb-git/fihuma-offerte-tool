export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/auth-session";
export type { SessionUser, UserRole } from "@/lib/auth-session";

export { userCanAccessProposal, proposalBelongsToAdvisor, filterProposalsForUser } from "@/lib/auth-proposals";
