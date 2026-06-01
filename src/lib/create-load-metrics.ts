export type CreateLoadMetrics = {
  totalMs: number;
  supabaseMs: number;
  pipedriveMs: number;
  renderMs: number;
};

export function logCreateLoadMetrics(phase: string, metrics: Partial<CreateLoadMetrics>) {
  if (typeof console === "undefined") return;
  console.info(`[create:perf] ${phase}`, metrics);
}
