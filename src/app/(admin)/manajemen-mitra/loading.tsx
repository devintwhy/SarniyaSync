// Kerangka Tampilan Halaman Manajemen Mitra
export default function ManajemenMitraLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-52 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-9 w-full rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="h-10 w-full rounded-xl bg-slate-300" />
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-8 w-48 rounded-lg bg-slate-100" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-2.5 w-24 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
