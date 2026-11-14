// Kerangka Tampilan Halaman Admin
export default function AdminLoading() {
  return (
    <div className="w-full space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="h-7 w-64 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-6 w-32 rounded bg-slate-300" />
            <div className="h-2.5 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
          <div className="h-64 rounded-lg bg-slate-100" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-slate-200" />
                  <div className="h-2.5 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-4 w-14 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

