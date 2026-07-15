"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGate({
  children,
  loadingFallback
}: {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (cancelled) return;

      if (response.ok && payload?.authenticated) {
        setIsAllowed(true);
        return;
      }

      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isAllowed) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
        <p className="text-sm font-bold text-[#64736b]">Inloggen controleren...</p>
      </main>
    );
  }

  return <>{children}</>;
}
