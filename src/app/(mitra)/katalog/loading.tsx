// Kerangka Tampilan Halaman Katalog Produk Mitra
export default function MitraKatalogLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="h-7 w-52 rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-64 rounded-lg bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-lg bg-slate-200" />
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="aspect-square w-full rounded-lg bg-slate-200" />
            <div className="space-y-1">
              <div className="h-3 w-16 rounded bg-slate-100" />
              <div className="h-3.5 w-full rounded bg-slate-200" />
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-slate-200" />
              <div className="h-4 w-12 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
