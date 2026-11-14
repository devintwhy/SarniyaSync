// Kerangka Tampilan Halaman Pengiriman Stok
export default function PengirimanLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="h-7 w-56 rounded-lg bg-slate-200" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-32 rounded-lg bg-slate-200" />
          <div className="h-8 w-28 rounded-lg bg-slate-200" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-9 w-64 rounded-lg bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-28 rounded bg-slate-100" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-16 rounded-md bg-slate-200" />
                <div className="h-6 w-24 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
