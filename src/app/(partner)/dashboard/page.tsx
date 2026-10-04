const partnerSummary = [
  { label: "Pesanan aktif", value: "6", detail: "2 perlu dikonfirmasi" },
  { label: "Penjualan bulan ini", value: "Rp 4,8 jt", detail: "Diperbarui hari ini" },
  { label: "Status toko", value: "Beroperasi", detail: "Toko terlihat oleh pelanggan" },
];

export default function PartnerDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Area Mitra Toko Offline</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Dashboard Toko</h1>
        <p className="mt-2 text-sm text-[#68756e]">Ringkasan aktivitas toko Anda.</p>
      </header>

      <section aria-label="Ringkasan toko" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {partnerSummary.map((item) => (
          <article key={item.label} className="rounded-md border border-[#e1e7e0] bg-white p-5">
            <p className="text-sm text-[#68756e]">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#173b32]">{item.value}</p>
            <p className="mt-2 text-xs text-[#64806b]">{item.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}