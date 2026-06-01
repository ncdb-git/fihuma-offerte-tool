const STEPS = ["Start", "Klant", "Maatregel", "Product", "Investering", "Klaar"];

export function CreateConfiguratorSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8f5] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-fihuma-line bg-white lg:w-[380px] lg:border-b-0 lg:border-r">
        <div className="border-b border-fihuma-line px-5 py-4">
          <div className="h-3 w-28 animate-pulse rounded bg-[#e8ede9]" />
          <div className="mt-3 h-6 w-48 animate-pulse rounded bg-[#e8ede9]" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-[#eef2ed]" />
          <div className="mt-3 flex flex-wrap gap-1">
            {STEPS.map((label) => (
              <span className="h-6 w-16 animate-pulse rounded-full bg-[#eef2ed]" key={label} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-[#d4e8dc]" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-[#eef2ed]" />
          </div>
        </div>
        <div className="flex-1 space-y-3 px-5 py-4">
          <div className="h-4 w-full animate-pulse rounded bg-[#eef2ed]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#eef2ed]" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-[#eef2ed]" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-[#eef2ed]" />
        </div>
      </aside>
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-[#eef2ed] p-8">
        <div className="aspect-[210/297] w-full max-w-md animate-pulse rounded-lg bg-white shadow-panel" />
      </div>
    </div>
  );
}
