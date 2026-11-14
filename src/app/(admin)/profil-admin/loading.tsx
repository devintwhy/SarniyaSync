export default function ProfilAdminLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-pulse">
      <header>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-7 w-48 rounded-lg bg-gray-300" />
        <div className="mt-1 h-3.5 w-72 rounded bg-gray-200" />
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-gray-300" />
            <div className="h-3 w-48 rounded bg-gray-200" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-200" />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="space-y-3 pt-2">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-200" />
      </section>
    </div>
  );
}
