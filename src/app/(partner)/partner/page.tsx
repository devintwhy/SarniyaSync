import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function PartnerHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, city, is_active")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  const activeStoreIds = (stores ?? []).filter((store) => store.is_active).map((store) => store.id);
  let availableStock = 0;
  let monthlyRevenue = 0;
  let monthlyTransactionCount = 0;
  let loadError = storesError?.message ?? "";
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      loadError = error.message;
      break;
    }

    const page = data ?? [];
    availableStock += page.reduce((sum, product) => sum + product.stock_quantity, 0);
    if (page.length < PAGE_SIZE) break;
  }

  if (activeStoreIds.length && !loadError) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("total")
        .in("partner_store_id", activeStoreIds)
        .gte("sold_at", monthStart)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        loadError = error.message;
        break;
      }

      const page = data ?? [];
      monthlyRevenue += page.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);
      monthlyTransactionCount += page.length;
      if (page.length < PAGE_SIZE) break;
    }
  }

  const metrics = [
    { label: "Toko Aktif", value: String(activeStoreIds.length), detail: "Toko yang dapat bertransaksi" },
    { label: "Stok Katalog Pusat", value: new Intl.NumberFormat("id-ID").format(availableStock), detail: "Total unit tersedia di produk aktif" },
    { label: "Omzet Bulan Ini", value: currencyFormatter.format(monthlyRevenue), detail: `${monthlyTransactionCount} transaksi` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Portal Mitra</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Dashboard</h1>
        <p className="mt-2 text-sm text-[#68756e]">Ringkasan toko, stok, dan penjualan Anda.</p>
      </header>

      {loadError && <p role="alert" className="mb-5 rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">Data portal gagal dimuat: {loadError}</p>}

      <section aria-label="Ringkasan Mitra" className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-md border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5">
            <p className="text-sm text-[#68756e]">{metric.label}</p>
            <p className="mt-3 break-words text-2xl font-semibold text-[#173b32]">{loadError ? "—" : metric.value}</p>
            <p className="mt-2 text-xs text-[#64806b]">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/partner/stok" className="rounded-md border border-[#d9e1d9] bg-white p-5 shadow-sm transition-colors hover:border-[#9eb9a2] hover:bg-[#fbfcfa]">
          <h2 className="font-semibold text-[#173b32]">Stok Toko</h2>
          <p className="mt-2 text-sm text-[#68756e]">Lihat produk dan sisa stok di toko yang Anda kelola.</p>
        </Link>
        <Link href="/partner/transaksi" className="rounded-md border border-[#d9e1d9] bg-white p-5 shadow-sm transition-colors hover:border-[#9eb9a2] hover:bg-[#fbfcfa]">
          <h2 className="font-semibold text-[#173b32]">Riwayat Transaksi</h2>
          <p className="mt-2 text-sm text-[#68756e]">Tinjau penjualan terbaru dari toko Anda.</p>
        </Link>
      </section>

      <section className="mt-8 overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Toko Saya</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Daftar toko yang terhubung dengan akun Anda.</p>
        </div>
        {!stores?.length ? (
          <p className="px-5 py-8 text-center text-sm text-[#68756e]">Belum ada toko yang ditugaskan ke akun ini.</p>
        ) : (
          <ul className="divide-y divide-[#edf0ec]">
            {stores.map((store) => (
              <li key={store.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[#293a32]">{store.name}</p>
                  <p className="mt-1 text-xs text-[#7b877f]">{store.city || "Lokasi belum diisi"}</p>
                </div>
                <span className={`rounded-sm px-2 py-1 text-xs font-medium ${store.is_active ? "bg-[#edf5e8] text-[#557b46]" : "bg-[#f0f3f1] text-[#68756e]"}`}>
                  {store.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}