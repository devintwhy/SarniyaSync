// Kerangka Tampilan Halaman Riwayat Transaksi Admin
export default function RiwayatAdminLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-6 w-28 rounded bg-slate-300" />
              <div className="h-2.5 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100">
          <div className="h-9 w-64 rounded-lg bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
            <div className="h-9 w-28 rounded-lg bg-slate-200" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-24 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
