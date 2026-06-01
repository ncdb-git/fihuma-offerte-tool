export type CreateLoadSpanView = {
  category: string;
  label: string;
  ms: number;
};

export type CreateLoadProfileView = {
  pipedriveMs: number;
  supabaseMs: number;
  serverMs: number;
  serverTotalMs: number;
  spans: CreateLoadSpanView[];
};

/** Frontend = muurklok minus Supabase minus Pipedrive (client-safe). */
export function buildCreateLoadTiming(profile: CreateLoadProfileView, totalWallMs: number) {
  const pipedriveMs = profile.pipedriveMs;
  const supabaseMs = profile.supabaseMs;
  const frontendMs = Math.max(0, totalWallMs - pipedriveMs - supabaseMs);

  return {
    totalMs: totalWallMs,
    pipedriveMs,
    supabaseMs,
    frontendMs,
    serverMs: profile.serverMs,
    spans: profile.spans
  };
}
