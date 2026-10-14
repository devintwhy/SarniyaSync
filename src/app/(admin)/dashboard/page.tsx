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
  let loadError = "";

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
        .slice(0, 5); // 5 Produk Terlaris

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

    // Urutkan item dengan stok paling sedikit
    lowStockItems.sort((a, b) => a.stock - b.stock);

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
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-block rounded-full bg-[#f7e4d4] px-3.5 py-1 text-xs font-bold text-[#9d5c4c]">
              Ringkasan Operasional
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-[#2d3440]">Dashboard Admin</h1>
            <p className="mt-1 text-sm sm:text-base text-[#6d7687]">Pantau performa penjualan, stok, dan mitra secara real-time.</p>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mb-5 rounded-2xl border border-rose-300 bg-rose-50/95 px-4 py-3 text-sm text-rose-800">
            {loadError}
          </p>
        )}

        {/* 1. Ringkasan Pendapatan Hari Ini & Rincian Metode Pembayaran */}
        <section aria-label="Ringkasan Pendapatan Hari Ini" className="mb-8">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f7e4d4] text-[#9d5c4c]">
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

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Kartu Utama: Pendapatan Hari Ini (Rose Gold Gradient) */}
              <div className="rounded-2xl bg-gradient-to-br from-[#e1b5a4] via-[#cc9787] to-[#9d5c4c] p-5 text-white shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                      Pendapatan Hari Ini
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30 backdrop-blur-sm">
                      Live
                    </span>
                  </div>
                  <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                    {currencyFormatter.format(todayRevenue)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-white/80">
                  Total omzet dari seluruh transaksi hari ini
                </p>
              </div>

              {/* Rincian Metode: QRIS */}
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">Metode QRIS</span>
                    <span className="inline-flex items-center rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                      QRIS
                    </span>
                  </div>
                  <p className="mt-3 text-xl sm:text-2xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayQris)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayQris / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Rincian Metode: Transfer */}
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">Metode Transfer</span>
                    <span className="inline-flex items-center rounded-xl bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      Transfer
                    </span>
                  </div>
                  <p className="mt-3 text-xl sm:text-2xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayTransfer)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayTransfer / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Rincian Metode: Tunai */}
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">Metode Tunai</span>
                    <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                      Tunai
                    </span>
                  </div>
                  <p className="mt-3 text-xl sm:text-2xl font-black text-[#2d3440]">
                    {currencyFormatter.format(todayTunai)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-[#7b877f]">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-[#2d3440]">
                    {todayRevenue > 0 ? Math.round((todayTunai / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Top Metrics (Bulan Ini) - Tetap Utuh */}
        <section aria-label="Statistik Utama" className="grid gap-4 md:grid-cols-3 mb-8">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-xl border border-[#f0ddd5] bg-white p-5 shadow-sm shadow-[#9d5c4c]/5">
              <p className="text-sm font-medium text-[#576071]">{metric.label}</p>
              <p className={`mt-3 break-words text-2xl font-bold text-balance ${metric.valueClass}`}>
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-[#7a8394]">{metric.detail}</p>
            </article>
          ))}
        </section>

        {/* 3. Advanced Analytics Charts - Tetap Utuh */}
        <div className="mb-8">
            <DashboardCharts 
                dailySales={dailySales} 
                topPartners={topPartners} 
                bestSellers={bestSellers} 
            />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 4. Peringatan Stok Menipis - Tetap Utuh */}
          <section aria-label="Peringatan stok menipis" className="overflow-hidden rounded-xl border border-[#f0ddd5] bg-white shadow-sm shadow-[#9d5c4c]/5 flex flex-col">
            <div className="flex flex-col gap-1 border-b border-[#f7e4d4] bg-[#fef8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-[#9d5c4c]">Peringatan Stok Menipis</h2>
                <p className="mt-1 text-sm text-[#cc8c7d]">Produk dengan stok &le; 5 unit.</p>
              </div>
              <span className="text-sm font-medium text-[#9d5c4c]">
                {loadError ? "—" : `${lowStockItems.length} peringatan`}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadError ? (
                <p className="px-5 py-8 text-center text-sm text-[#7a8394]">Daftar peringatan belum tersedia.</p>
              ) : lowStockItems.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#7a8394]">Tidak ada produk dengan stok menipis.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fef8f6] text-xs uppercase text-[#cc9787]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-bold">Produk</th>
                      <th scope="col" className="px-5 py-3 font-bold">Lokasi</th>
                      <th scope="col" className="px-5 py-3 text-right font-bold">Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f7e4d4]">
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#fef8f6] transition-colors">
                        <th scope="row" className="px-5 py-4 font-medium text-[#2d3440]">
                          <div>{item.name}</div>
                          <div className="mt-0.5 text-xs font-normal text-[#7a8394]">{item.sku} &middot; {item.category}</div>
                        </th>
                        <td className="px-5 py-4 text-[#576071]">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.location === 'Pusat'
                              ? 'bg-[#f7e4d4] text-[#9d5c4c]'
                              : 'bg-slate-100 text-[#576071]'
                          }`}>
                            {item.location}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-1 text-xs font-bold ${
                            item.stock === 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-[#f7e4d4] text-[#9d5c4c]'
                          }`}>
                            {numberFormatter.format(item.stock)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 5. Transaksi Terbaru */}
          <section aria-label="Transaksi Terbaru" className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm flex flex-col">
            <div className="flex flex-col gap-1 border-b border-slate-100 bg-[#f8fafc] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-[#2d3440]">Transaksi Terbaru</h2>
                <p className="mt-0.5 text-xs text-[#7b877f]">5 penjualan terakhir.</p>
              </div>
              <Link href="/penjualan" className="text-xs font-bold text-[#9d5c4c] hover:underline">
                Lihat Semua &rarr;
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadError ? (
                <p className="px-5 py-8 text-center text-sm text-[#68756e]">Daftar transaksi belum tersedia.</p>
              ) : recentTransactions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#68756e]">Belum ada transaksi.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase font-bold text-[#576071]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-bold">Tanggal</th>
                      <th scope="col" className="px-5 py-3 font-bold">Toko Mitra</th>
                      <th scope="col" className="px-5 py-3 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-[#68756e] whitespace-nowrap">
                          {dateFormatter.format(new Date(tx.sold_at))}
                        </td>
                        <th scope="row" className="px-5 py-3.5 text-sm font-semibold text-[#2d3440]">
                          {tx.store_name}
                        </th>
                        <td className="px-5 py-3.5 text-right font-bold text-[#2d3440] whitespace-nowrap">
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
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    return (
        <div className="p-8">
            <p className="text-red-500">Gagal memuat dashboard. Periksa koneksi ke database.</p>
        </div>
    );
  }
}
