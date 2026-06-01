import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type CreateLoadCategory = "pipedrive" | "supabase" | "server";

export type CreateLoadSpan = {
  category: CreateLoadCategory;
  label: string;
  ms: number;
};

export type CreateLoadProfile = {
  pipedriveMs: number;
  supabaseMs: number;
  serverMs: number;
  serverTotalMs: number;
  spans: CreateLoadSpan[];
};

type ProfilerStore = {
  profiler: CreateLoadProfiler;
};

const store = new AsyncLocalStorage<ProfilerStore>();

export function runWithCreateLoadProfiler<T>(fn: () => Promise<T>): Promise<{ result: T; profile: CreateLoadProfile }> {
  const profiler = new CreateLoadProfiler();
  return store.run({ profiler }, async () => {
    const result = await fn();
    return { result, profile: profiler.finish() };
  });
}

export function getCreateLoadProfiler() {
  return store.getStore()?.profiler ?? null;
}

export async function profiledLoad<T>(
  category: CreateLoadCategory,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const profiler = getCreateLoadProfiler();
  if (!profiler) return fn();
  return profiler.measure(category, label, fn);
}

export class CreateLoadProfiler {
  private spans: CreateLoadSpan[] = [];

  async measure<T>(category: CreateLoadCategory, label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.spans.push({
        category,
        label,
        ms: Math.round(performance.now() - start)
      });
    }
  }

  finish(): CreateLoadProfile {
    const pipedriveMs = this.sumCategory("pipedrive");
    const supabaseMs = this.sumCategory("supabase");
    const serverMs = this.sumCategory("server");
    return {
      pipedriveMs,
      supabaseMs,
      serverMs,
      serverTotalMs: pipedriveMs + supabaseMs + serverMs,
      spans: [...this.spans]
    };
  }

  private sumCategory(category: CreateLoadCategory) {
    return this.spans.filter((span) => span.category === category).reduce((sum, span) => sum + span.ms, 0);
  }
}

export { buildCreateLoadTiming } from "@/lib/create-load-timing";
