// Kerangka Tampilan Halaman Laporan Penyesuaian Stok
export default function LaporanPenyesuaianLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-64 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-7 w-36 rounded bg-slate-300" />
            <div className="h-2.5 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-9 w-64 rounded-lg bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
            <div className="h-9 w-36 rounded-lg bg-slate-200" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="grid grid-cols-6 gap-4 py-3 items-center">
              <div className="h-3.5 w-24 rounded bg-slate-200" />
              <div className="h-3.5 w-28 rounded bg-slate-200" />
              <div className="h-3.5 w-20 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded-full bg-slate-200" />
              <div className="h-3.5 w-24 rounded bg-slate-200" />
              <div className="h-7 w-12 rounded-lg bg-slate-200 justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
