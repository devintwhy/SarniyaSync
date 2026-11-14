// Skeleton Loading Halaman Kasir (POS) Mitra
export default function KasirLoading() {
  return (
    <div className="w-full animate-pulse">
      <div className="mb-4 space-y-1.5">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2">
            <div className="h-9 flex-1 rounded-lg bg-slate-200" />
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="aspect-square rounded-lg bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="h-7 rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="h-3 w-28 rounded bg-slate-200" />
                  <div className="h-2.5 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-24 rounded bg-slate-300" />
            </div>
            <div className="h-10 rounded-xl bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

