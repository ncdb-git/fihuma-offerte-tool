"use client";

import { AUTH_STORAGE_KEY } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(window.localStorage.getItem(AUTH_STORAGE_KEY) === "true" ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-6">
      <p className="text-sm font-bold text-[#64736b]">App openen...</p>
    </main>
  );
}
