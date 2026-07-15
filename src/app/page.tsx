"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      router.replace(response.ok && payload?.authenticated ? "/dashboard" : "/login");
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
      <p className="text-sm font-bold text-[#64736b]">App openen...</p>
    </main>
  );
}
