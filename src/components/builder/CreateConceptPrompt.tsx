"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateConceptPrompt({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function createConcept() {
    setIsCreating(true);
    setError("");

    const response = await fetch("/api/pipedrive/create-concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Concept aanmaken mislukt.");
      setIsCreating(false);
      return;
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
      <section className="w-full max-w-xl rounded-[28px] border border-fihuma-line border-t-4 border-t-fihuma-green bg-white p-8 shadow-[0_24px_70px_rgba(23,34,29,0.10)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-fihuma-green">Pipedrive deal {dealId}</p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-[#17221d]">Er bestaat nog geen concept voor deze Pipedrive deal.</h1>
        <p className="mt-3 text-sm leading-6 text-[#526158]">Maak alleen een offerteconcept aan als deze deal daadwerkelijk via de offerteflow opgepakt moet worden.</p>

        {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <button className="rounded-xl bg-fihuma-green px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isCreating} onClick={createConcept} type="button">
            {isCreating ? "Concept aanmaken..." : "Concept aanmaken"}
          </button>
          <button className="rounded-xl border border-fihuma-line px-5 py-3 text-sm font-black text-[#4a5751]" onClick={() => router.push("/dashboard")} type="button">
            Terug naar dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
