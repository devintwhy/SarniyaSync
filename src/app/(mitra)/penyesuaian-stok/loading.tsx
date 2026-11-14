export default function MitraPenyesuaianStokLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="mt-2 h-7 w-48 rounded-lg bg-gray-300" />
          <div className="mt-1 h-3.5 w-80 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-44 rounded-xl bg-gray-200" />
      </header>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>

        <div className="p-4 space-y-3">
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
          <div className="h-12 rounded-lg bg-gray-100" />
        </div>
      </section>
    </div>
  );
}
