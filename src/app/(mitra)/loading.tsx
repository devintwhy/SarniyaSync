// Kerangka Tampilan Halaman Mitra
export default function MitraLoading() {
  return (
    <div className="w-full space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-6 w-28 rounded bg-slate-300" />
            <div className="h-2.5 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-100" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-slate-200" />
                  <div className="h-2.5 w-24 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

