"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProposalBuilder } from "@/components/builder/ProposalBuilder";
import { CreateConfiguratorSkeleton } from "@/components/create/CreateConfiguratorSkeleton";
import { CreateLoadWaterfall, type CreateLoadTimingView } from "@/components/create/CreateLoadWaterfall";
import {
  fetchCreateBootstrap,
  fetchPipedriveRefresh,
  type CreateBootstrapRequest,
  type CreateBootstrapResponse
} from "@/lib/create-bootstrap-client";
import { buildCreateLoadTiming, type CreateLoadProfileView } from "@/lib/create-load-timing";
import { logCreateLoadMetrics } from "@/lib/create-load-metrics";
import type { Proposal } from "@/lib/types";

type LoadedDeal = {
  mode: "deal";
  proposal: Proposal;
  dealId: string;
  siblings: NonNullable<CreateBootstrapResponse["siblings"]>;
};

type LoadedManual = {
  mode: "manual_existing" | "manual_created";
  proposal: Proposal;
};

type LoadedState = LoadedDeal | LoadedManual;

function buildBootstrapRequest(searchParams: URLSearchParams, debug: boolean): CreateBootstrapRequest {
  return {
    dealId: searchParams.get("deal_id") ?? undefined,
    proposalId: searchParams.get("proposal_id") ?? undefined,
    manualId: searchParams.get("id") ?? undefined,
    createNew: searchParams.get("new") === "1",
    startManual: searchParams.get("manual") === "1",
    debug
  };
}

function paramsKey(searchParams: URLSearchParams) {
  return [
    searchParams.get("deal_id"),
    searchParams.get("proposal_id"),
    searchParams.get("id"),
    searchParams.get("new"),
    searchParams.get("manual")
  ].join("|");
}

export function CreateProposalLoader() {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "true";
  const requestKey = useMemo(() => paramsKey(searchParams), [searchParams]);

  const wallStartRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const refreshGenerationRef = useRef(0);

  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [pipedriveSync, setPipedriveSync] = useState<Proposal | null>(null);
  const [timing, setTiming] = useState<CreateLoadTimingView | null>(null);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    const ac = new AbortController();
    wallStartRef.current = performance.now();

    setError(null);
    setLoaded(null);
    setPipedriveSync(null);
    setTiming(null);

    const body = buildBootstrapRequest(searchParams, debug);

    void (async () => {
      try {
        const data = await fetchCreateBootstrap(body, ac.signal);
        if (generation !== loadGenerationRef.current || ac.signal.aborted) return;

        const renderStart = performance.now();
        const totalMs = Math.round(performance.now() - wallStartRef.current);
        const profile: CreateLoadProfileView = data.profile ?? {
          pipedriveMs: 0,
          supabaseMs: 0,
          serverMs: 0,
          serverTotalMs: 0,
          spans: []
        };
        const mergedTiming = buildCreateLoadTiming(profile, totalMs);
        const renderMs = Math.round(performance.now() - renderStart);

        logCreateLoadMetrics("bootstrap", {
          totalMs,
          supabaseMs: mergedTiming.supabaseMs,
          pipedriveMs: mergedTiming.pipedriveMs,
          renderMs
        });

        if (debug) setTiming(mergedTiming);

        if (data.mode === "deal" && data.dealId) {
          setLoaded({
            mode: "deal",
            proposal: data.proposal,
            dealId: data.dealId,
            siblings: data.siblings ?? []
          });

          if (data.needsPipedriveRefresh) {
            const refreshGen = ++refreshGenerationRef.current;
            void fetchPipedriveRefresh(
              {
                dealId: data.dealId,
                proposalId: data.proposal.id,
                debug
              },
              ac.signal
            )
              .then((refresh) => {
                if (refreshGen !== refreshGenerationRef.current || ac.signal.aborted) return;
                if (refresh.updated) {
                  setPipedriveSync(refresh.proposal);
                  logCreateLoadMetrics("pipedrive-refresh", { totalMs: Math.round(performance.now() - wallStartRef.current) });
                }
              })
              .catch((refreshError) => {
                if (refreshGen !== refreshGenerationRef.current || ac.signal.aborted) return;
                console.warn("[create] achtergrond Pipedrive-sync mislukt", refreshError);
              });
          }
          return;
        }

        setLoaded({
          mode: data.mode as LoadedManual["mode"],
          proposal: data.proposal
        });
      } catch (loadError) {
        if (generation !== loadGenerationRef.current || ac.signal.aborted) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Configurator laden mislukt.");
      }
    })();

    return () => {
      ac.abort();
    };
  }, [requestKey, debug]);

  if (error) {
    return (
      <AuthGate loadingFallback={<CreateConfiguratorSkeleton />}>
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
          <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-panel">
            <h1 className="text-lg font-black text-red-800">Offerte openen mislukt</h1>
            <p className="mt-2 text-sm text-[#4a5751]">{error}</p>
            <a className="mt-4 inline-block text-sm font-bold text-fihuma-green underline" href="/dashboard">
              Terug naar werkvoorraad
            </a>
          </div>
        </main>
      </AuthGate>
    );
  }

  if (!loaded) {
    return (
      <AuthGate loadingFallback={<CreateConfiguratorSkeleton />}>
        <CreateConfiguratorSkeleton />
      </AuthGate>
    );
  }

  return (
    <AuthGate loadingFallback={<CreateConfiguratorSkeleton />}>
      {debug && timing ? <CreateLoadWaterfall timing={timing} /> : null}
      {loaded.mode === "deal" ? (
        <ProposalBuilder
          dealId={loaded.dealId}
          initialProposal={loaded.proposal}
          pipedriveSync={pipedriveSync}
          siblingProposals={loaded.siblings}
        />
      ) : (
        <ProposalBuilder initialProposal={loaded.proposal} pipedriveSync={pipedriveSync} />
      )}
    </AuthGate>
  );
}
