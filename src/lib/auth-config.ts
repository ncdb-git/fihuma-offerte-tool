import "server-only";

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export function getAuthConfig() {
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const missing: string[] = [];
  if (!sessionSecret) missing.push("SESSION_SECRET");
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    sessionSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
    missing,
    isReady: missing.length === 0
  };
}

export function assertAuthConfig() {
  const config = getAuthConfig();
  if (!config.isReady) {
    throw new AuthConfigError(`Auth configuratie ontbreekt: ${config.missing.join(", ")}`);
  }
  return config;
}
