"use client";

import { CreateOfferteLink } from "@/components/dashboard/CreateOfferteLink";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.user) {
        setUser(payload.user);
      }
    })();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-fihuma-line bg-white px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fihuma-green text-lg font-black text-white">F</div>
          <div>
            <p className="text-sm font-black">Fihuma</p>
            <p className="text-xs text-[#64736b]">Proposal Engine</p>
          </div>
        </div>
        <nav className="mt-10 grid gap-2 text-sm font-semibold">
          <Link className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-fihuma-mint" href="/dashboard">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <CreateOfferteLink />
          {user?.role === "admin" ? (
            <Link className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-fihuma-mint" href="/admin/advisors">
              <Users size={18} /> Adviseurs
            </Link>
          ) : null}
        </nav>
        <div className="mt-auto grid gap-3">
          {user ? (
            <div className="rounded-lg border border-fihuma-line bg-fihuma-sand px-3 py-2 text-xs text-[#64736b]">
              <p className="font-black text-[#17221d]">{user.name}</p>
              <p>{user.email}</p>
              <p className="mt-1 uppercase tracking-wide">{user.role === "admin" ? "Admin" : "Adviseur"}</p>
            </div>
          ) : null}
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line bg-white px-3 py-2 text-xs font-black text-[#4a5751] transition hover:border-fihuma-green hover:text-fihuma-green"
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogOut size={15} /> Uitloggen
          </button>
          <div className="rounded-lg border border-fihuma-line bg-fihuma-sand p-4 text-xs text-[#64736b]">Domein: offertes.fihumacollectief.nl</div>
        </div>
      </aside>
      <main className="pl-64">{children}</main>
    </div>
  );
}
