"use client";

import { AUTH_STORAGE_KEY } from "@/lib/auth";
import { FileText, LayoutDashboard, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
          <Link className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-fihuma-mint" href="/create?deal_id=1248">
            <FileText size={18} /> Offerte maken
          </Link>
          <Link className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-fihuma-mint" href="/admin/advisors">
            <Users size={18} /> Adviseurs
          </Link>
        </nav>
        <div className="mt-auto grid gap-3">
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-fihuma-line bg-white px-3 py-2 text-xs font-black text-[#4a5751] transition hover:border-fihuma-green hover:text-fihuma-green"
            onClick={() => {
              window.localStorage.removeItem(AUTH_STORAGE_KEY);
              router.replace("/login");
            }}
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
