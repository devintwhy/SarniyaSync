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

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  let loadError = "";

  // 1. Top Metrics
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
    // For 30 days trend
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(now.getDate() - 30);
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();
    
    // For Top Metrics (Month to Date)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch transactions for the last 30 days to cover both the chart and this month's metrics
    const { data: recentMonthTransactions, error: txError } = await (supabase
      .from("sales_transactions")
      .select(`
        total,
        items,
        sold_at,
        partner_stores ( name )
      `)
      .gte("sold_at", thirtyDaysAgo) as any);

    if (txError) throw txError;

    if (recentMonthTransactions) {
      for (const tx of recentMonthTransactions) {
        const isThisMonth = tx.sold_at >= startOfMonth;
        const total = Number(tx.total || 0);

        // Group by Date for Chart (Last 30 Days)
        const dateString = new Date(tx.sold_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        salesByDate[dateString] = (salesByDate[dateString] || 0) + total;

        // Group by Partner and Product (Only for This Month)
        if (isThisMonth) {
          totalOmzet += total;
          
          const storeName = Array.isArray(tx.partner_stores) 
             ? tx.partner_stores[0]?.name 
             : tx.partner_stores?.name || "Unknown Store";
             
          salesByPartner[storeName] = (salesByPartner[storeName] || 0) + total;

          // Process JSONB items
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

    // Prepare arrays for DashboardCharts
    const dailySales = Object.entries(salesByDate)
        .map(([date, total]) => ({ date, total }))
        // If sorting by date string is needed, it might be tricky since format is "01 Oct". 
        // A better approach is usually generating the last 30 days array and filling it, but for simplicity we rely on the DB order or chronological keys.

    const topPartners = Object.entries(salesByPartner)
        .map(([storeName, totalSales]) => ({ storeName, totalSales }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5); // Top 5 Partners

    const bestSellers = Object.entries(salesByProduct)
        .map(([productName, quantity]) => ({ productName, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5 Products

    // Fetch active partners count
    const { count: partnersCount, error: partnersError } = await supabase
      .from("partner_stores")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (partnersError) throw partnersError;
    activePartnersCount = partnersCount || 0;

    // Fetch Low Stock from Pusat (products)
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

    // Fetch Low Stock from Mitra (partner_store_inventory joined with products and partner_stores)
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
      mitraInventory.forEach(inv => {
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

    // Sort all low stock items
    lowStockItems.sort((a, b) => a.stock - b.stock);

    // Fetch Recent Transactions
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
      recentTransactions = recentData.map(tx => {
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
        valueClass: "text-[#315d3e]",
      },
      {
        label: "Total Barang Terjual",
        value: loadError ? "—" : numberFormatter.format(totalItemsSold),
        detail: "Unit terjual bulan ini",
        valueClass: "text-[#173b32]",
      },
      {
        label: "Total Mitra Aktif",
        value: loadError ? "—" : numberFormatter.format(activePartnersCount),
        detail: "Toko mitra yang beroperasi",
        valueClass: "text-[#173b32]",
      },
    ];

    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-[#557b64]">Ringkasan operasional</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Dashboard Admin</h1>
            <p className="mt-2 text-sm text-[#68756e]">Pantau performa penjualan, stok, dan mitra secara real-time.</p>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mb-5 rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
            {loadError}
          </p>
        )}

        {/* Top Metrics */}
        <section aria-label="Statistik Utama" className="grid gap-4 md:grid-cols-3 mb-8">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-xl border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5">
              <p className="text-sm font-medium text-[#68756e]">{metric.label}</p>
              <p className={`mt-3 break-words text-2xl font-bold text-balance ${metric.valueClass}`}>
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-[#7b877f]">{metric.detail}</p>
            </article>
          ))}
        </section>

        {/* Advanced Analytics Charts */}
        <div className="mb-8">
            <DashboardCharts 
                dailySales={dailySales} 
                topPartners={topPartners} 
                bestSellers={bestSellers} 
            />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Peringatan Stok Menipis */}
          <section aria-label="Peringatan stok menipis" className="overflow-hidden rounded-xl border border-[#ead8b5] bg-white shadow-sm shadow-[#765a36]/5 flex flex-col">
            <div className="flex flex-col gap-1 border-b border-[#f0e4cd] bg-[#fff8e9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-[#765a36]">Peringatan Stok Menipis</h2>
                <p className="mt-1 text-sm text-[#8b7352]">Produk dengan stok &le; 5 unit.</p>
              </div>
              <span className="text-sm font-medium text-[#9a6733]">
                {loadError ? "—" : `${lowStockItems.length} peringatan`}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadError ? (
                <p className="px-5 py-8 text-center text-sm text-[#68756e]">Daftar peringatan belum tersedia.</p>
              ) : lowStockItems.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#557b64]">Tidak ada produk dengan stok menipis.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fffdf8] text-xs uppercase text-[#8b7352]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Produk</th>
                      <th scope="col" className="px-5 py-3 font-medium">Lokasi</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e8d8]">
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#fffdf8] transition-colors">
                        <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">
                          <div>{item.name}</div>
                          <div className="mt-0.5 text-xs font-normal text-[#7b877f]">{item.sku} &middot; {item.category}</div>
                        </th>
                        <td className="px-5 py-4 text-[#68756e]">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.location === 'Pusat' ? 'bg-[#edf5e8] text-[#315d3e]' : 'bg-[#f0f3f1] text-[#52645a]'}`}>
                            {item.location}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-1 text-xs font-bold ${item.stock === 0 ? "bg-[#fff0eb] text-[#a44d36]" : "bg-[#fff4d8] text-[#946019]"}`}>
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

          {/* Transaksi Terbaru */}
          <section aria-label="Transaksi Terbaru" className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5 flex flex-col">
            <div className="flex flex-col gap-1 border-b border-[#edf0ec] bg-[#f7f9f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-[#173b32]">Transaksi Terbaru</h2>
                <p className="mt-1 text-sm text-[#7b877f]">5 penjualan terakhir.</p>
              </div>
              <Link href="/penjualan" className="text-sm font-medium text-[#315d3e] hover:underline">
                Lihat Semua &rarr;
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadError ? (
                <p className="px-5 py-8 text-center text-sm text-[#68756e]">Daftar transaksi belum tersedia.</p>
              ) : recentTransactions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#557b64]">Belum ada transaksi.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafbf9] text-xs uppercase text-[#68756e]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Tanggal</th>
                      <th scope="col" className="px-5 py-3 font-medium">Toko Mitra</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ec]">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#fafbf9] transition-colors">
                        <td className="px-5 py-4 text-[#68756e] whitespace-nowrap">
                          {dateFormatter.format(new Date(tx.sold_at))}
                        </td>
                        <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">
                          {tx.store_name}
                        </th>
                        <td className="px-5 py-4 text-right font-semibold text-[#173b32] whitespace-nowrap">
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
    )
  }
}