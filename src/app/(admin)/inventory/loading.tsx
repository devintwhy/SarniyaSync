// Skeleton Loading Halaman Inventaris Produk Admin
export default function InventoryLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="h-9 w-56 rounded-lg bg-slate-200" />
          <div className="h-9 w-32 rounded-lg bg-slate-200" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-slate-200" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 rounded bg-slate-200" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3.5 items-center">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-200 shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-3 w-28 rounded bg-slate-200" />
                  <div className="h-2.5 w-16 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-5 w-14 rounded-full bg-slate-200" />
              <div className="flex gap-2 justify-end">
                <div className="h-7 w-16 rounded-lg bg-slate-200" />
                <div className="h-7 w-16 rounded-lg bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

