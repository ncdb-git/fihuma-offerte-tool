import { AuthGate } from "@/components/auth/AuthGate";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { AppShell } from "@/components/dashboard/AppShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <AuthGate>
      <AppShell>
        <DashboardClient />
      </AppShell>
    </AuthGate>
  );
}
