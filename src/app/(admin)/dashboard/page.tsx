import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import DashboardCharts from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  location: string;
};

type RecentTransaction = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
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

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const loadError = "";

  // 0. Metrik Hari Ini & Metode Pembayaran (Baru)
  let todayRevenue = 0;
  let todayTransactionCount = 0;
  let todayQris = 0;
  let todayTransfer = 0;
  let todayTunai = 0;

  // 1. Top Metrics (Month to Date)
  let totalOmzet = 0;
  let totalItemsSold = 0;
  let activePartnersCount = 0;

  // 2. Low Stock Alerts
  const lowStockItems: LowStockItem[] = [];

  // 3. Recent Transactions
  let recentTransactions: RecentTransaction[] = [];

  // Advanced Analytics
  const salesByDate: Record<string, number> = {};
  const salesByPartner: Record<string, number> = {};
  const salesByProduct: Record<string, number> = {};

  try {
    const now = new Date();
    // Rentang 30 hari untuk grafik tren
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(now.getDate() - 30);
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();
    
    // Rentang awal bulan untuk metrik bulanan
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Mengambil transaksi 30 hari terakhir beserta payment_method
    const { data: recentMonthTransactions, error: txError } = await (supabase
      .from("sales_transactions")
      .select(`
        total,
        items,
        sold_at,
        payment_method,
        partner_stores ( name )
      `)
      .gte("sold_at", thirtyDaysAgo) as any);

    if (txError) throw txError;

    if (recentMonthTransactions) {
      for (const tx of recentMonthTransactions) {
        const total = Number(tx.total || 0);
        const txDate = new Date(tx.sold_at);
        const isToday = txDate.toDateString() === now.toDateString();
        const isThisMonth = tx.sold_at >= startOfMonth;

        // Hitung Pendapatan Hari Ini & Rincian Metode Pembayaran
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

        // Kelompokkan per tanggal untuk Grafik Tren (30 Hari Terakhir)
        const dateString = txDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        salesByDate[dateString] = (salesByDate[dateString] || 0) + total;

        // Kelompokkan Mitra dan Produk (Khusus Bulan Berjalan)
        if (isThisMonth) {
          totalOmzet += total;
          
          const storeName = Array.isArray(tx.partner_stores) 
             ? tx.partner_stores[0]?.name 
             : tx.partner_stores?.name || "Unknown Store";
             
          salesByPartner[storeName] = (salesByPartner[storeName] || 0) + total;

          // Ekstraksi item dari JSONB
          if (Array.isArray(tx.items)) {
            for (const item of tx.items) {
               const record = item as any;
               if (record && typeof record === 'object' && record.quantity && record.name) {
                   const qty = Number(record.quantity);
                   totalItemsSold += qty;
                   salesByProduct[record.name] = (salesByProduct[record.name] || 0) + qty;
               }
            }
          }
        }
      }
    }

    // Persiapan data untuk DashboardCharts
    const dailySales = Object.entries(salesByDate)
        .map(([date, total]) => ({ date, total }));

    const topPartners = Object.entries(salesByPartner)
        .map(([storeName, totalSales]) => ({ storeName, totalSales }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5); // 5 Mitra Teratas

    const bestSellers = Object.entries(salesByProduct)
        .map(([productName, quantity]) => ({ productName, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // 5 Produk Terlaris (Top 5)

    // Ambil jumlah mitra aktif
    const { count: partnersCount, error: partnersError } = await supabase
      .from("partner_stores")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (partnersError) throw partnersError;
    activePartnersCount = partnersCount || 0;

    // Ambil stok menipis di Pusat (products)
    const { data: pusatProducts, error: pusatError } = await supabase
      .from("products")
      .select("id, sku, name, category, stock_quantity")
      .lte("stock_quantity", 5)
      .order("stock_quantity", { ascending: true });

    if (pusatError) throw pusatError;
    if (pusatProducts) {
      pusatProducts.forEach(p => {
        lowStockItems.push({
          id: `pusat-${p.id}`,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock: p.stock_quantity,
          location: "Pusat",
        });
      });
    }

    // Ambil stok menipis di Mitra (partner_store_inventory)
    const { data: mitraInventory, error: mitraError } = await (supabase
      .from("partner_store_inventory")
      .select(`
        id,
        stock_quantity,
        partner_stores ( name ),
        products ( sku, name, category )
      `)
      .lte("stock_quantity", 5)
      .order("stock_quantity", { ascending: true }) as any);

    if (mitraError) throw mitraError;
    if (mitraInventory) {
      mitraInventory.forEach((inv: any) => {
        const product = Array.isArray(inv.products) ? inv.products[0] : inv.products;
        const store = Array.isArray(inv.partner_stores) ? inv.partner_stores[0] : inv.partner_stores;
        
        if (product && store) {
            lowStockItems.push({
            id: `mitra-${inv.id}`,
            sku: product.sku || "-",
            name: product.name || "-",
            category: product.category || "-",
            stock: inv.stock_quantity,
            location: `Mitra: ${store.name}`,
            });
        }
      });
    }

    // Urutkan item dengan stok paling sedikit dan batasi maksimal 5 item
    lowStockItems.sort((a, b) => a.stock - b.stock);
    const displayLowStockItems = lowStockItems.slice(0, 5);

    // Ambil 5 transaksi terbaru
    const { data: recentData, error: recentError } = await (supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        sold_at,
        total,
        partner_stores ( name )
      `)
      .order("sold_at", { ascending: false })
      .limit(5) as any);
      
    if (recentError) throw recentError;
    if (recentData) {
      recentTransactions = recentData.map((tx: any) => {
        const store = Array.isArray(tx.partner_stores) ? tx.partner_stores[0] : tx.partner_stores;
        return {
            id: tx.id,
            transaction_number: tx.transaction_number,
            sold_at: tx.sold_at,
            total: tx.total,
            store_name: store?.name || "Unknown Store",
        };
      });
    }
    const displayRecentTransactions = recentTransactions.slice(0, 5);

    const metrics = [
      {
        label: "Total Omzet Bulan Ini",
        value: loadError ? "—" : currencyFormatter.format(totalOmzet),
        detail: "Pendapatan dari seluruh transaksi",
        valueClass: "text-[#9d5c4c]",
      },
      {
        label: "Total Barang Terjual",
        value: loadError ? "—" : numberFormatter.format(totalItemsSold),
        detail: "Unit terjual bulan ini",
        valueClass: "text-[#cc8c7d]",
      },
      {
        label: "Total Mitra Aktif",
        value: loadError ? "—" : numberFormatter.format(activePartnersCount),
        detail: "Toko mitra yang beroperasi",
        valueClass: "text-[#cc8c7d]",
      },
    ];

    return (
      <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
        <header className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="inline-block rounded-full bg-almond-cream px-3 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
              Ringkasan Operasional
            </span>
            <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
              Dashboard Admin
            </h1>
            <p className="mt-0.5 text-xs text-[#6d7687]">
              Pantau performa penjualan, stok, dan mitra secara real-time.
            </p>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-300 bg-rose-50/95 px-4 py-2.5 text-xs text-rose-800">
            {loadError}
          </p>
        )}

        {/* 1. Ringkasan Pendapatan Hari Ini & Rincian Metode Pembayaran */}
        <section aria-label="Ringkasan Pendapatan Hari Ini" className="mb-4">
          <div className="rounded-2xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-flat">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#a3b1c6]/20">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-almond-cream text-terracotta-clay shadow-neu-sm">
                  Hari Ini
                </span>
                <span className="text-xs text-[#7b877f]">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}
                </span>
              </div>
              <div className="text-xs text-[#68756e]">
                Total Transaksi Hari Ini:{" "}
                <span className="font-bold text-[#2d3440]">
                  {numberFormatter.format(todayTransactionCount)} transaksi
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Kartu Utama: Pendapatan Hari Ini */}
              <div className="rounded-xl bg-gradient-to-br from-almond-silk via-rosy-taupe to-terracotta-clay p-3.5 text-white shadow-neu-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                      Pendapatan Hari Ini
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white border border-white/30 backdrop-blur-sm">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    {currencyFormatter.format(todayRevenue)}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-white/80">
                  Total omzet dari seluruh transaksi hari ini
                </p>
              </div>

              {/* Rincian Metode: QRIS */}
              <div className="rounded-xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">Metode QRIS</span>
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      QRIS
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayQris)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayQris / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Rincian Metode: Transfer */}
              <div className="rounded-xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">Metode Transfer</span>
                    <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Transfer
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayTransfer)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayTransfer / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Rincian Metode: Tunai */}
              <div className="rounded-xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">Metode Tunai</span>
                    <span className="inline-flex items-center rounded-lg bg-[#e0e5ec] px-2 py-0.5 text-[10px] font-bold text-[#2d3440] shadow-neu-sm">
                      Tunai
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayTunai)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayTunai / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Top Metrics (Bulan Ini) */}
        <section aria-label="Statistik Utama" className="grid gap-3 md:grid-cols-3 mb-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl bg-[#e0e5ec] p-3.5 shadow-neu-sm">
              <p className="text-xs font-semibold text-[#576071]">{metric.label}</p>
              <p className={`mt-2 break-words text-xl font-black ${metric.valueClass}`}>
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] text-[#7a8394]">{metric.detail}</p>
            </article>
          ))}
        </section>

        {/* 3. Baris Tengah (Sandingkan 2 Kolom Sejajar: Grafik Tren Kiri + Leaderboard Kanan) */}
        <div className="mb-4">
          <DashboardCharts 
            dailySales={dailySales} 
            topPartners={topPartners} 
          />
        </div>

        {/* 4. Baris Bawah (Sandingkan 3 Kolom Sejajar: Produk Terlaris + Transaksi Terbaru + Stok Menipis) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          {/* ── Kolom 1: Produk Terlaris (Top 5 Best Sellers) ───────────── */}
          <section
            aria-label="Produk Terlaris"
            className="h-full flex flex-col rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40 overflow-hidden"
          >
            {/* Bagian Header (flex-shrink-0) */}
            <div className="border-b border-[#a3b1c6]/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-black text-[#2d3440]">Produk Terlaris</h2>
                <p className="text-[11px] text-[#7a8394]">Top 5 produk terfavorit bulan ini.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-almond-cream px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
                Top 5
              </span>
            </div>

            {/* Bagian Daftar Item (flex flex-col flex-1 justify-between) */}
            <div className="flex-1 flex flex-col p-4">
              {bestSellers.length === 0 ? (
                <p className="text-center text-xs text-[#6d7687] py-6 my-auto">
                  Belum ada data penjualan produk.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 ${
                    bestSellers.length >= 4 ? "justify-between" : "justify-start gap-2.5"
                  }`}
                >
                  {bestSellers.map((item, index) => (
                    <div
                      key={item.productName}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-xl hover:bg-almond-cream/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-almond-silk/50 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
                          #{index + 1}
                        </span>
                        <p
                          className="truncate text-xs font-bold text-[#2d3440]"
                          title={item.productName}
                        >
                          {item.productName}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-almond-cream px-2 py-0.5 text-[11px] font-black tabular-nums text-terracotta-clay shadow-neu-sm">
                        {numberFormatter.format(item.quantity)} pcs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Kolom 2: Transaksi Terbaru (5 Transaksi Terakhir) ───────── */}
          <section
            aria-label="Transaksi Terbaru"
            className="h-full flex flex-col rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40 overflow-hidden"
          >
            {/* Bagian Header (flex-shrink-0) */}
            <div className="border-b border-[#a3b1c6]/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-black text-[#2d3440]">Transaksi Terbaru</h2>
                <p className="text-[11px] text-[#7a8394]">5 penjualan gerai kasir terakhir.</p>
              </div>
              <Link
                href="/penjualan"
                className="text-[11px] font-bold text-terracotta-clay hover:underline"
              >
                Semua &rarr;
              </Link>
            </div>

            {/* Bagian Daftar Item (flex flex-col flex-1 justify-between) */}
            <div className="flex-1 flex flex-col p-4">
              {loadError ? (
                <p className="px-3 py-6 text-center text-xs text-[#68756e] my-auto">
                  Daftar transaksi belum tersedia.
                </p>
              ) : displayRecentTransactions.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[#68756e] my-auto">
                  Belum ada transaksi.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 divide-y divide-[#a3b1c6]/15 ${
                    displayRecentTransactions.length >= 4 ? "justify-between" : "justify-start gap-2"
                  }`}
                >
                  {displayRecentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-almond-cream/20 transition-colors rounded-xl"
                    >
                      <div className="min-w-0">
                        <p
                          className="font-bold text-[#2d3440] truncate max-w-[130px]"
                          title={tx.store_name}
                        >
                          {tx.store_name}
                        </p>
                        <p className="text-[10px] text-[#7a8394] font-mono">
                          {tx.transaction_number}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-black text-terracotta-clay text-xs">
                          {currencyFormatter.format(tx.total)}
                        </p>
                        <p className="text-[10px] text-[#7a8394]">
                          {dateFormatter.format(new Date(tx.sold_at))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Kolom 3: Peringatan Stok Menipis (Top 5 Stok Kritis) ────── */}
          <section
            aria-label="Peringatan stok menipis"
            className="h-full flex flex-col rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40 overflow-hidden"
          >
            {/* Bagian Header (flex-shrink-0) */}
            <div className="border-b border-[#a3b1c6]/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-black text-terracotta-clay">Stok Menipis</h2>
                <p className="text-[11px] text-[#7a8394]">Maksimal 5 item kritis (&le; 5 unit).</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 shadow-neu-sm">
                {loadError ? "—" : `${displayLowStockItems.length} item`}
              </span>
            </div>

            {/* Bagian Daftar Item (flex flex-col flex-1 justify-between saat penuh, rata atas saat 1) */}
            <div className="flex-1 flex flex-col p-4">
              {loadError ? (
                <p className="px-3 py-6 text-center text-xs text-[#7a8394] my-auto">
                  Daftar peringatan belum tersedia.
                </p>
              ) : displayLowStockItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[#7a8394] my-auto">
                  Tidak ada produk menipis.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 divide-y divide-[#a3b1c6]/15 ${
                    displayLowStockItems.length >= 4 ? "justify-between" : "justify-start gap-2"
                  }`}
                >
                  {displayLowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-almond-cream/20 transition-colors rounded-xl"
                    >
                      <div className="min-w-0">
                        <p
                          className="font-bold text-[#2d3440] truncate max-w-[140px]"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[#7a8394] truncate">
                          {item.location}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span
                          className={`inline-flex min-w-[2.2rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold shadow-neu-sm ${
                            item.stock === 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-almond-cream text-terracotta-clay"
                          }`}
                        >
                          {numberFormatter.format(item.stock)} pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    return (
        <div className="p-8">
            <p className="text-red-500">Gagal memuat dashboard. Periksa koneksi ke database.</p>
        </div>
    );
  }
}
