export default function StoreReportLoading() {
  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-10 lg:py-10 space-y-6 animate-pulse">
      <header className="space-y-3">
        <div className="h-4 w-36 rounded bg-gray-200" />
        <div className="h-4 w-28 rounded-full bg-gray-200" />
        <div className="h-8 w-64 rounded-lg bg-gray-300" />
        <div className="h-4 w-48 rounded bg-gray-200" />
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-20 rounded bg-gray-300" />
        </div>
        <div className="h-28 rounded-xl bg-gray-200 p-6 shadow-sm">
          <div className="h-3 w-32 rounded bg-gray-300" />
          <div className="mt-3 h-8 w-40 rounded bg-gray-300" />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="space-y-3 pt-2">
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
        </div>
      </section>
    </div>
  );
}
