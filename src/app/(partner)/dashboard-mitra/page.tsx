import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PartnerDashboardCharts from "@/components/partner-dashboard-charts";

export const dynamic = "force-dynamic";

type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  storeName: string;
};

type RecentTransaction = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
  payment_method: string;
  store_name: string;
};

const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PartnerDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil Toko Milik Mitra yang sedang login
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, city, is_active, status")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  if (storesError) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <p className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
          Gagal memuat profil toko: {storesError.message}
        </p>
      </div>
    );
  }

  const activeStores = (stores ?? []).filter((store) =>
    store.status ? store.status === "aktif" : store.is_active
  );
  const activeStoreIds = activeStores.map((s) => s.id);

  // Jika mitra belum memiliki toko aktif
  if (activeStoreIds.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="rounded-2xl border border-[#d2ddd6] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#f4f8f5] text-2xl">
            🏪
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#9d5c4c]">Belum Ada Toko Aktif</h1>
          <p className="mt-2 text-sm text-[#68756e]">
            Akun Anda belum memiliki toko dengan status aktif. Hubungi Administrator pusat untuk
            verifikasi dan aktivasi toko mitra Anda.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/partner/profil"
              className="rounded-md border border-[#9d5c4c] px-4 py-2 text-sm font-medium text-[#9d5c4c] hover:bg-[#f4f8f5]"
            >
              Cek Status Profil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Rentang Waktu
  const now = new Date();
  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(now.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Variabel Akumulasi Metrik
  let todayRevenue = 0;
  let todayTransactionCount = 0;
  let todayQris = 0;
  let todayTransfer = 0;
  let todayTunai = 0;

  let monthlyRevenue = 0;
  let monthlyItemsSold = 0;
  let monthlyTransactionCount = 0;

  const salesByDate: Record<string, number> = {};
  const salesByProduct: Record<string, number> = {};

  // 2. Query Transaksi 30 Hari Terakhir KHUSUS Toko Mitra
  const { data: transactions } = await (supabase
    .from("sales_transactions")
    .select(`
      id,
      transaction_number,
      total,
      items,
      sold_at,
      payment_method,
      partner_store_id
    `)
    .in("partner_store_id", activeStoreIds)
    .gte("sold_at", thirtyDaysAgo)
    .order("sold_at", { ascending: true }) as any);

  if (transactions) {
    for (const tx of transactions) {
      const total = Number(tx.total || 0);
      const txDate = new Date(tx.sold_at);
      const isToday = txDate.toDateString() === now.toDateString();
      const isThisMonth = tx.sold_at >= startOfMonth;

      // Metrik Hari Ini
      if (isToday) {
        todayRevenue += total;
        todayTransactionCount += 1;
        const method = String(tx.payment_method || "cash").toLowerCase().trim();
        if (method === "qris") {
          todayQris += total;
        } else if (method === "transfer") {
          todayTransfer += total;
        } else {
          todayTunai += total;
        }
      }

      // Grafik Tren 30 Hari Terakhir
      const dateString = txDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      salesByDate[dateString] = (salesByDate[dateString] || 0) + total;

      // Metrik & Produk Terlaris Bulan Berjalan
      if (isThisMonth) {
        monthlyRevenue += total;
        monthlyTransactionCount += 1;

        if (Array.isArray(tx.items)) {
          for (const item of tx.items) {
            const record = item as any;
            if (record && typeof record === "object" && record.quantity && record.name) {
              const qty = Number(record.quantity);
              monthlyItemsSold += qty;
              salesByProduct[record.name] = (salesByProduct[record.name] || 0) + qty;
            }
          }
        }
      }
    }
  }

  // Data Array untuk Grafik Harian
  const dailySales = Object.entries(salesByDate).map(([date, total]) => ({
    date,
    total,
  }));

  // Top 5 Produk Terlaris di Toko Saya
  const bestSellers = Object.entries(salesByProduct)
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 3. Query Peringatan Stok Menipis (stok <= 5 unit) KHUSUS Inventaris Toko Mitra
  const { data: lowStockData } = await (supabase
    .from("partner_store_inventory")
    .select(`
      id,
      stock_quantity,
      partner_stores ( name ),
      products ( sku, name, category, price )
    `)
    .in("partner_store_id", activeStoreIds)
    .lte("stock_quantity", 5)
    .order("stock_quantity", { ascending: true }) as any);

  const lowStockItems: LowStockItem[] = [];
  if (lowStockData) {
    lowStockData.forEach((inv: any) => {
      const product = Array.isArray(inv.products) ? inv.products[0] : inv.products;
      const store = Array.isArray(inv.partner_stores) ? inv.partner_stores[0] : inv.partner_stores;

      if (product) {
        lowStockItems.push({
          id: inv.id,
          sku: product.sku || "-",
          name: product.name || "-",
          category: product.category || "-",
          stock: Number(inv.stock_quantity ?? 0),
          storeName: store?.name || "Toko Saya",
        });
      }
    });
  }

  // 4. Query 5 Transaksi Penjualan Terbaru Toko Mitra
  const { data: recentData } = await (supabase
    .from("sales_transactions")
    .select(`
      id,
      transaction_number,
      sold_at,
      total,
      payment_method,
      partner_stores ( name )
    `)
    .in("partner_store_id", activeStoreIds)
    .order("sold_at", { ascending: false })
    .limit(5) as any);

  const recentTransactions: RecentTransaction[] = (recentData ?? []).map((tx: any) => {
    const store = Array.isArray(tx.partner_stores) ? tx.partner_stores[0] : tx.partner_stores;
    return {
      id: tx.id,
      transaction_number: tx.transaction_number,
      sold_at: tx.sold_at,
      total: tx.total,
      payment_method: tx.payment_method || "Tunai",
      store_name: store?.name || "Toko Saya",
    };
  });

  const storeNames = activeStores.map((s) => s.name).join(", ");

  const metrics = [
    {
      label: "Total Omzet Bulan Ini",
      value: currencyFormatter.format(monthlyRevenue),
      detail: `${numberFormatter.format(monthlyTransactionCount)} transaksi berhasil`,
      valueClass: "text-[#315d3e]",
    },
    {
      label: "Total Barang Terjual",
      value: `${numberFormatter.format(monthlyItemsSold)} unit`,
      detail: "Barang keluar bulan ini",
      valueClass: "text-[#9d5c4c]",
    },
    {
      label: "Peringatan Stok Menipis",
      value: `${numberFormatter.format(lowStockItems.length)} produk`,
      detail: "Stok sisa ≤ 5 unit",
      valueClass: lowStockItems.length > 0 ? "text-[#a44d36]" : "text-[#9d5c4c]",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4">
      {/* ── Header Dasbor Mitra ─────────────────────────────────────────── */}
      <header className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
              Portal Mitra
            </span>
            <span className="text-xs text-[#7a8394]">&bull; {storeNames}</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">Dasbor Toko Saya</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#6d7687]">
            Pantau omzet harian, performa produk, dan peringatan stok inventaris toko Anda secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/partner/kasir"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99]"
          >
            + Kasir POS
          </Link>
          <Link
            href="/partner/transaksi"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-[#2d3440] shadow-sm transition-all hover:bg-slate-50"
          >
            Riwayat Transaksi
          </Link>
        </div>
      </header>

      {/* ── 1. Pendapatan Hari Ini & Rincian Pembayaran (Live Banner) ────── */}
      <section aria-label="Ringkasan Pendapatan Hari Ini">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm shadow-[#2d3440]/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#f7e4d4] text-[#9d5c4c]">
                Hari Ini
              </span>
              <span className="text-xs text-[#7a8394]">
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}
              </span>
            </div>
            <div className="text-xs text-[#6d7687]">
              Transaksi Hari Ini:{" "}
              <span className="font-bold text-[#2d3440]">
                {numberFormatter.format(todayTransactionCount)} struk
              </span>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Kartu Utama: Total Pendapatan Hari Ini (Rose Gold Gradient) */}
            <div className="rounded-xl bg-gradient-to-br from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] p-3.5 sm:p-4 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                    Pendapatan Hari Ini
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                    Live
                  </span>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">
                  {currencyFormatter.format(todayRevenue)}
                </p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-white/80">Total omzet kas masuk toko hari ini</p>
            </div>

            {/* Rincian Metode: QRIS */}
            <div className="rounded-xl border border-slate-200/80 bg-[#f0f2f5]/40 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8394]">QRIS</span>
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                    QRIS
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                  {currencyFormatter.format(todayQris)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px] text-[#7a8394]">
                <span>Porsi hari ini</span>
                <span className="font-bold text-[#2d3440]">
                  {todayRevenue > 0 ? Math.round((todayQris / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Rincian Metode: Transfer */}
            <div className="rounded-xl border border-slate-200/80 bg-[#f0f2f5]/40 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8394]">Transfer Bank</span>
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                    Transfer
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                  {currencyFormatter.format(todayTransfer)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px] text-[#7a8394]">
                <span>Porsi hari ini</span>
                <span className="font-bold text-[#2d3440]">
                  {todayRevenue > 0 ? Math.round((todayTransfer / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Rincian Metode: Tunai */}
            <div className="rounded-xl border border-slate-200/80 bg-[#f0f2f5]/40 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8394]">Tunai / Cash</span>
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-300/60">
                    Tunai
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                  {currencyFormatter.format(todayTunai)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px] text-[#7a8394]">
                <span>Porsi hari ini</span>
                <span className="font-bold text-[#2d3440]">
                  {todayRevenue > 0 ? Math.round((todayTunai / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Top Metrics Toko Mitra Bulan Ini ──────────────────────────── */}
      <section aria-label="Statistik Utama Mitra" className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm shadow-[#2d3440]/5"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8394]">{metric.label}</p>
            <p className={`mt-2 break-words text-xl sm:text-2xl font-black text-balance ${metric.valueClass.replace('text-[#9d5c4c]', 'text-[#2d3440]')}`}>
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-[#6d7687]">{metric.detail}</p>
          </article>
        ))}
      </section>

      {/* ── 3. Grafik Tren 30 Hari & Produk Terlaris Toko Saya ───────────── */}
      <div>
        <PartnerDashboardCharts dailySales={dailySales} bestSellers={bestSellers} />
      </div>

      {/* ── 4. Tabel Peringatan Stok Menipis & 5 Transaksi Terbaru ─────────── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Peringatan Stok Menipis Toko Mitra */}
        <section
          aria-label="Peringatan stok menipis toko saya"
          className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm flex flex-col"
        >
          <div className="flex flex-col gap-1 border-b border-amber-100 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-amber-900 text-sm sm:text-base">Peringatan Stok Toko Saya</h2>
              <p className="text-xs text-amber-700">Produk di inventaris toko dengan stok &le; 5 unit.</p>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full self-start sm:self-auto">
              {lowStockItems.length} produk menipis
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {lowStockItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="text-2xl">✅</span>
                <p className="mt-1.5 text-xs sm:text-sm font-bold text-emerald-700">Semua stok toko Anda dalam kondisi aman!</p>
                <p className="text-[11px] text-[#7a8394]">Tidak ada produk dengan sisa stok &le; 5 unit.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-amber-50/30 text-[11px] uppercase text-amber-900 font-bold">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Produk</th>
                    <th scope="col" className="px-3.5 py-2.5">Kategori</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                      <th scope="row" className="px-3.5 py-2 font-semibold text-[#2d3440]">
                        <div>{item.name}</div>
                        <div className="text-[10px] font-mono font-normal text-[#7a8394]">{item.sku}</div>
                      </th>
                      <td className="px-3.5 py-2 text-[#576071]">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#576071]">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <span
                          className={`inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-xs font-bold ${
                            item.stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {numberFormatter.format(item.stock)} pcs
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 5 Penjualan Terbaru Toko Mitra */}
        <section
          aria-label="Transaksi terbaru toko saya"
          className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5 flex flex-col"
        >
          <div className="flex flex-col gap-1 border-b border-slate-100 bg-[#f0f2f5]/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-[#2d3440] text-sm sm:text-base">Penjualan Terbaru Toko Saya</h2>
              <p className="text-xs text-[#7a8394]">5 transaksi kasir terakhir.</p>
            </div>
            <Link href="/partner/transaksi" className="text-xs font-bold text-[#9d5c4c] hover:underline self-start sm:self-auto">
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentTransactions.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs sm:text-sm text-[#6d7687]">
                Belum ada transaksi penjualan yang tercatat.
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f0f2f5] text-[11px] uppercase tracking-wider text-[#6d7687] font-bold">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Tanggal</th>
                    <th scope="col" className="px-3.5 py-2.5">No. Struk</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2 text-[#576071] whitespace-nowrap text-[11px]">
                        {dateFormatter.format(new Date(tx.sold_at))}
                      </td>
                      <th scope="row" className="px-3.5 py-2 font-semibold text-[#2d3440]">
                        <div>{tx.transaction_number}</div>
                        <span className="inline-block rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold uppercase text-[#576071]">
                          {tx.payment_method}
                        </span>
                      </th>
                      <td className="px-3.5 py-2 text-right font-black text-[#2d3440] whitespace-nowrap text-xs sm:text-sm">
                        {currencyFormatter.format(tx.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
