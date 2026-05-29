"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateOfferteLink() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startBlankOffer() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/proposals/manual", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; proposal?: { id: string } };

      if (!response.ok || !payload.ok || !payload.proposal?.id) {
        throw new Error(payload.error ?? "Blanco offerte aanmaken mislukt.");
      }

      router.push(`/create?id=${encodeURIComponent(payload.proposal.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Blanco offerte aanmaken mislukt.");
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-fihuma-mint disabled:opacity-60"
        disabled={isLoading}
        onClick={() => void startBlankOffer()}
        type="button"
      >
        <FileText size={18} /> {isLoading ? "Offerte laden…" : "Offerte maken"}
      </button>
      {error ? <p className="px-3 text-[11px] font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
