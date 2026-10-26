export default function AdminDashboardLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="mt-2 h-7 w-56 rounded-lg bg-gray-300" />
          <div className="mt-1 h-3.5 w-72 rounded bg-gray-200" />
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="h-5 w-36 rounded-full bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>

        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-xl bg-gray-200" />
          <div className="h-28 rounded-xl bg-gray-200" />
          <div className="h-28 rounded-xl bg-gray-200" />
          <div className="h-28 rounded-xl bg-gray-200" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="mt-3 h-6 w-32 rounded bg-gray-300" />
        </div>
        <div className="h-28 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="mt-3 h-6 w-32 rounded bg-gray-300" />
        </div>
        <div className="h-28 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="mt-3 h-6 w-32 rounded bg-gray-300" />
        </div>
        <div className="h-28 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="mt-3 h-6 w-32 rounded bg-gray-300" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="mt-4 h-56 rounded bg-gray-100" />
        </div>
        <div className="h-72 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="mt-4 h-56 rounded bg-gray-100" />
        </div>
      </section>
    </div>
  );
}
