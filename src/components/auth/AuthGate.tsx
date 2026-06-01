"use client";

import { AUTH_STORAGE_KEY } from "@/lib/auth";
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
    if (window.localStorage.getItem(AUTH_STORAGE_KEY) === "true") {
      setIsAllowed(true);
      return;
    }

    router.replace("/login");
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
