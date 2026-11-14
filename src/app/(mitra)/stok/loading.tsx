// Kerangka Tampilan Halaman Stok Mitra
export default function MitraStokLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded-full bg-slate-200" />
          <div className="h-7 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-200" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-9 w-64 rounded-lg bg-slate-200" />
          <div className="h-9 w-40 rounded-lg bg-slate-200" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 rounded bg-slate-200" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3.5 items-center">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <div className="h-3.5 w-28 rounded bg-slate-200" />
                    <div className="h-2.5 w-16 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-6 w-20 rounded-md bg-slate-200 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
