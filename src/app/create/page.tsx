import { Suspense } from "react";
import { CreateProposalLoader } from "@/components/create/CreateProposalLoader";

export const dynamic = "force-dynamic";

export default function CreateProposalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
          <p className="text-sm font-bold text-[#64736b]">Configurator laden…</p>
        </main>
      }
    >
      <CreateProposalLoader />
    </Suspense>
  );
}
