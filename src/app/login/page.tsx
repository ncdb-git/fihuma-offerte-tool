"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const FIHUMA_LOGO_SRC = "/brand/Logo%20Fihuma.png";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.authenticated) {
        router.replace(searchParams.get("next") || "/dashboard");
      }
    })();
  }, [router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Inloggen mislukt. Probeer het opnieuw.");
        return;
      }

      router.replace(searchParams.get("next") || "/dashboard");
    } catch {
      setError("Inloggen mislukt. Controleer je internetverbinding en probeer opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={FIHUMA_LOGO_SRC} alt="Fihuma" className="mx-auto h-auto w-40" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#dae0db] border-t-4 border-t-fihuma-green bg-white p-8 shadow-[0_24px_70px_rgba(23,34,29,0.10)]">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-fihuma-green">Offerte tool</p>
          <h1 className="text-4xl font-black tracking-[-0.045em] text-[#17221d]">Inloggen</h1>
          <p className="mt-3 text-sm leading-6 text-[#526158]">Log in om verder te gaan met de offerte tool.</p>

          <div className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold text-[#64736b]">E-mailadres</span>
              <input
                autoComplete="email"
                className="rounded-xl border border-[#dae0db] px-4 py-3 text-sm outline-none transition focus:border-fihuma-green focus:ring-4 focus:ring-[#50ae4c]/10"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="naam@fihumacollectief.nl"
                type="email"
                value={email}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold text-[#64736b]">Wachtwoord</span>
              <input
                autoComplete="current-password"
                className="rounded-xl border border-[#dae0db] px-4 py-3 text-sm outline-none transition focus:border-fihuma-green focus:ring-4 focus:ring-[#50ae4c]/10"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Wachtwoord"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

            <button
              className="mt-2 rounded-xl bg-fihuma-green px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(80,174,76,0.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Bezig met inloggen..." : "Inloggen"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
          <p className="text-sm font-bold text-[#64736b]">Inlogpagina laden...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
