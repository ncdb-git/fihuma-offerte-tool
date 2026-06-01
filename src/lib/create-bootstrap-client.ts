"use client";

import type { CreateLoadProfileView } from "@/lib/create-load-timing";
import type { CreateLoadTimingView } from "@/components/create/CreateLoadWaterfall";
import type { Proposal } from "@/lib/types";

export type CreateBootstrapRequest = {
  dealId?: string;
  proposalId?: string;
  manualId?: string;
  createNew?: boolean;
  startManual?: boolean;
  debug?: boolean;
};

export type CreateBootstrapResponse = {
  ok: true;
  mode: "deal" | "manual_existing" | "manual_created";
  proposal: Proposal;
  dealId?: string;
  siblings?: { proposal: Proposal; createdAt: string; updatedAt: string }[];
  needsPipedriveRefresh?: boolean;
  profile?: CreateLoadProfileView;
  timing?: CreateLoadTimingView;
};

type InflightEntry = {
  promise: Promise<CreateBootstrapResponse>;
  abort: AbortController;
};

const inflight = new Map<string, InflightEntry>();

function requestKey(body: CreateBootstrapRequest) {
  return JSON.stringify(body);
}

export async function fetchCreateBootstrap(
  body: CreateBootstrapRequest,
  signal?: AbortSignal
): Promise<CreateBootstrapResponse> {
  const key = requestKey(body);
  const existing = inflight.get(key);
  if (existing) {
    if (signal) {
      signal.addEventListener("abort", () => {
        if (signal.aborted) existing.abort.abort();
      });
    }
    return existing.promise;
  }

  const abort = new AbortController();
  if (signal) {
    if (signal.aborted) abort.abort();
    else signal.addEventListener("abort", () => abort.abort(), { once: true });
  }

  const promise = (async () => {
    const response = await fetch("/api/create/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: abort.signal
    });
    const data = (await response.json()) as CreateBootstrapResponse | { ok: false; error?: string };
    if (!response.ok || !data.ok) {
      const err = "error" in data ? data.error : undefined;
      throw new Error(err ?? "Configurator laden mislukt.");
    }
    return data;
  })().finally(() => {
    if (inflight.get(key)?.abort === abort) inflight.delete(key);
  });

  inflight.set(key, { promise, abort });
  return promise;
}

export async function fetchPipedriveRefresh(
  body: { dealId: string; proposalId: string; force?: boolean; debug?: boolean },
  signal?: AbortSignal
) {
  const response = await fetch("/api/create/refresh-pipedrive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });
  const data = (await response.json()) as
    | { ok: true; proposal: Proposal; updated: boolean }
    | { ok: false; error?: string };
  if (!response.ok || !data.ok) {
    throw new Error("error" in data ? data.error ?? "Pipedrive-verversen mislukt." : "Pipedrive-verversen mislukt.");
  }
  return data;
}
